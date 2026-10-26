import { timingSafeEqual } from 'node:crypto'
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'
import type { TransactionService } from '../../services/transactionService.js'
import { presentTransaction, presentVerification } from '../presenters.js'
import { HashParam, ListQuery, TransactionInput, VerifyPayloadInput, errorRef } from '../schemas.js'

export type TransactionRoutesOptions = {
    service: TransactionService
    apiKey?: string
}

const TAG = 'Transactions'
const security = [{ ApiKeyAuth: [] }]
const hashParams = Type.Object({ hash: HashParam })

const commonErrors = {
    400: errorRef('Petición inválida (VALIDATION_ERROR).'),
    401: errorRef('Falta o es incorrecta la cabecera x-api-key (UNAUTHORIZED). Solo si el servicio tiene API_KEY.'),
    500: errorRef('Error inesperado (INTERNAL_ERROR).'),
}

function sameKey(provided: string, expected: string): boolean {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

export const transactionRoutes: FastifyPluginAsyncTypebox<TransactionRoutesOptions> = async (app, { service, apiKey }) => {
    if (apiKey) {
        app.addHook('onRequest', async (request, reply) => {
            const provided = request.headers['x-api-key']
            if (typeof provided !== 'string' || !sameKey(provided, apiKey))
                return reply.code(401).send({
                    statusCode: 401,
                    error: 'Unauthorized',
                    code: 'UNAUTHORIZED',
                    message: 'Falta o es incorrecta la cabecera x-api-key',
                })
        })
    }

    app.post(
        '/transactions',
        {
            schema: {
                tags: [TAG],
                operationId: 'registerTransaction',
                summary: 'Registrar una operación',
                description:
                    'Hashea la operación con un salt nuevo, guarda el registro y sella el hash en la blockchain ISBE, ' +
                    '**esperando a la confirmación** antes de responder (≈ 2 s). Ver el flujo completo en la descripción general.',
                security,
                body: TransactionInput,
                response: {
                    201: Type.Ref('TransactionResponse', {
                        description: 'Operación registrada y sellada en la blockchain (blockchain.status = confirmed).',
                    }),
                    ...commonErrors,
                    409: errorRef(
                        'El id_product_order ya está registrado (DUPLICATE_ORDER). El campo record contiene el registro existente.'
                    ),
                    502: errorRef(
                        'El registro se guardó pero la blockchain falló (BLOCKCHAIN_UNAVAILABLE, CONFIRMATION_TIMEOUT, MISSING_ROLE, ' +
                            'CONTRACT_PAUSED, TRANSACTION_REVERTED). El campo record contiene el registro en estado failed; ' +
                            'se puede reintentar con POST /transactions/{hash}/retry.'
                    ),
                },
            },
        },
        async (request, reply) => {
            const record = await service.register(request.body)
            return reply.code(201).send(presentTransaction(record))
        }
    )

    app.get(
        '/transactions',
        {
            schema: {
                tags: [TAG],
                operationId: 'listTransactions',
                summary: 'Buscar operaciones',
                description: 'Lista paginada de registros, del más reciente al más antiguo, con filtros opcionales por coincidencia exacta.',
                security,
                querystring: ListQuery,
                response: {
                    200: Type.Ref('TransactionList', { description: 'Página de resultados.' }),
                    ...commonErrors,
                },
            },
        },
        async (request) => {
            const { status, limit, offset, ...filters } = request.query
            const { items, total } = await service.list({ ...filters, blockchain_status: status, limit, offset })
            return { items: items.map(presentTransaction), total, limit, offset }
        }
    )

    app.post(
        '/transactions/verify',
        {
            schema: {
                tags: ['Verification'],
                operationId: 'verifyPayload',
                summary: 'Verificar datos aportados (campos + salt)',
                description:
                    'Para quien tiene los datos de una operación y su salt (p. ej. un auditor): recalcula el hash y comprueba ' +
                    'en la blockchain si está registrado y desde qué fecha. No se fía del log; solo indica si además existe en él. ' +
                    'Responde 200 tanto si verifica como si no: mirar el campo verified. Solo lectura, no gasta gas.',
                security,
                body: VerifyPayloadInput,
                response: {
                    200: Type.Ref('VerificationResponse', { description: 'Resultado de la verificación.' }),
                    ...commonErrors,
                    502: errorRef('No se pudo consultar la blockchain (BLOCKCHAIN_UNAVAILABLE).'),
                },
            },
        },
        async (request) => presentVerification(await service.verifyPayload(request.body))
    )

    app.get(
        '/transactions/:hash',
        {
            schema: {
                tags: [TAG],
                operationId: 'getTransaction',
                summary: 'Consultar una operación por su hash',
                security,
                params: hashParams,
                response: {
                    200: Type.Ref('TransactionResponse', { description: 'Registro encontrado.' }),
                    ...commonErrors,
                    404: errorRef('No existe ningún registro con ese hash (NOT_FOUND).'),
                },
            },
        },
        async (request) => presentTransaction(await service.get(request.params.hash.toLowerCase()))
    )

    app.get(
        '/transactions/:hash/verify',
        {
            schema: {
                tags: ['Verification'],
                operationId: 'verifyTransaction',
                summary: 'Verificar una operación del log',
                description:
                    'Recalcula el hash con los campos y el salt guardados en la base de datos (hash_matches = false indicaría ' +
                    'que el registro se ha alterado) y comprueba en la blockchain si está registrado y con qué fecha. ' +
                    'Responde 200 tanto si verifica como si no: mirar el campo verified. Solo lectura, no gasta gas.',
                security,
                params: hashParams,
                response: {
                    200: Type.Ref('VerificationResponse', { description: 'Resultado de la verificación.' }),
                    ...commonErrors,
                    404: errorRef('No existe ningún registro con ese hash (NOT_FOUND).'),
                    502: errorRef('No se pudo consultar la blockchain (BLOCKCHAIN_UNAVAILABLE).'),
                },
            },
        },
        async (request) => presentVerification(await service.verifyRecord(request.params.hash.toLowerCase()))
    )

    app.post(
        '/transactions/:hash/retry',
        {
            schema: {
                tags: [TAG],
                operationId: 'retryTransaction',
                summary: 'Reintentar el sellado de una operación',
                description:
                    'Para registros en estado failed o pending. Primero comprueba si un intento anterior llegó a la blockchain ' +
                    '(p. ej. tras un CONFIRMATION_TIMEOUT) y, si es así, solo actualiza el registro; si no, vuelve a enviar el ' +
                    'mismo hash. Si el registro ya está confirmed lo devuelve sin hacer nada (idempotente).',
                security,
                params: hashParams,
                response: {
                    200: Type.Ref('TransactionResponse', { description: 'Registro confirmado.' }),
                    ...commonErrors,
                    404: errorRef('No existe ningún registro con ese hash (NOT_FOUND).'),
                    502: errorRef('La blockchain volvió a fallar; el registro sigue en estado failed (ver record).'),
                },
            },
        },
        async (request) => presentTransaction(await service.retry(request.params.hash.toLowerCase()))
    )
}
