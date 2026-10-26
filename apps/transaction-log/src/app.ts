import { Ajv } from 'ajv'
import addFormatsPlugin from 'ajv-formats'
import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { BlockchainError, type BlockchainClient } from './blockchain/types.js'
import type { TransactionRepository } from './db/transactionRepository.js'
import { DuplicateOrderError, NotFoundError } from './domain/transaction.js'
import { API_DESCRIPTION } from './http/openapiDescription.js'
import { presentTransaction } from './http/presenters.js'
import { healthRoutes } from './http/routes/health.js'
import { transactionRoutes } from './http/routes/transactions.js'
import { sharedSchemas } from './http/schemas.js'
import { ChainRegistrationError, TransactionService } from './services/transactionService.js'

// ajv-formats es CommonJS: en ESM el plugin llega como default.default según el cargador
const addFormats = ((addFormatsPlugin as unknown as { default?: typeof addFormatsPlugin }).default ??
    addFormatsPlugin) as unknown as (ajv: Ajv) => Ajv

export type AppOptions = {
    repository: TransactionRepository
    blockchain: BlockchainClient
    blockchainMode: 'isbe' | 'mock'
    apiKey?: string
    publicUrl?: string
    logger?: FastifyServerOptions['logger']
}

export const API_VERSION = '0.1.0'

function createAjv(options: { coerceTypes: boolean | 'array' }) {
    const ajv = new Ajv({
        ...options,
        useDefaults: true,
        removeAdditional: false,
        allErrors: false,
        // Permite las palabras clave de documentación de OpenAPI en los esquemas
        strict: false,
    })
    addFormats(ajv)
    return ajv
}

export async function buildApp(options: AppOptions) {
    const app = Fastify({ logger: options.logger ?? false }).withTypeProvider<TypeBoxTypeProvider>()

    // El body se valida sin convertir tipos ni quitar campos de más: el hash debe calcularse sobre
    // exactamente lo que envió el cliente (un 42 numérico no puede convertirse en "42" en silencio).
    // Query string, params y cabeceras sí convierten, porque siempre llegan como texto (?limit=20).
    const validators = {
        body: createAjv({ coerceTypes: false }),
        other: createAjv({ coerceTypes: 'array' }),
    }
    app.setValidatorCompiler(({ schema, httpPart }) =>
        (httpPart === 'body' ? validators.body : validators.other).compile(schema)
    )

    await app.register(swagger, {
        openapi: {
            openapi: '3.1.0',
            info: {
                title: 'Transaction Log · ISBE',
                version: API_VERSION,
                description: API_DESCRIPTION,
            },
            servers: [{ url: options.publicUrl ?? 'http://localhost:3000', description: 'Este servicio' }],
            tags: [
                { name: 'Transactions', description: 'Registro y consulta de operaciones' },
                { name: 'Verification', description: 'Comprobación de operaciones contra la blockchain' },
                { name: 'Health', description: 'Estado del servicio' },
            ],
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'x-api-key',
                        description: 'Solo se exige si el servicio arranca con la variable API_KEY definida.',
                    },
                },
            },
        },
        refResolver: {
            // Publica los esquemas compartidos en components.schemas con su $id como nombre
            buildLocalReference: (json, _baseUri, _fragment, index) => (json.$id as string) || `def-${index}`,
        },
    })
    await app.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: { docExpansion: 'list', deepLinking: true, displayRequestDuration: true },
    })

    for (const schema of sharedSchemas) app.addSchema(schema)

    app.setErrorHandler((error: FastifyError, request, reply) => {
        if (error.validation)
            return reply.code(400).send({ statusCode: 400, error: 'Bad Request', code: 'VALIDATION_ERROR', message: error.message })
        if (error instanceof DuplicateOrderError)
            return reply.code(409).send({
                statusCode: 409,
                error: 'Conflict',
                code: 'DUPLICATE_ORDER',
                message: error.message,
                record: presentTransaction(error.existing),
            })
        if (error instanceof NotFoundError)
            return reply.code(404).send({ statusCode: 404, error: 'Not Found', code: 'NOT_FOUND', message: error.message })
        if (error instanceof ChainRegistrationError)
            return reply.code(502).send({
                statusCode: 502,
                error: 'Bad Gateway',
                code: error.chainError.code,
                message: error.message,
                record: presentTransaction(error.record),
            })
        if (error instanceof BlockchainError)
            return reply.code(502).send({ statusCode: 502, error: 'Bad Gateway', code: error.code, message: error.message })
        if (error.statusCode && error.statusCode < 500)
            // Errores de Fastify como JSON mal formado o Content-Type no soportado
            return reply.code(error.statusCode).send({
                statusCode: error.statusCode,
                error: 'Bad Request',
                code: error.statusCode === 400 ? 'VALIDATION_ERROR' : (error.code ?? 'BAD_REQUEST'),
                message: error.message,
            })

        request.log.error({ err: error }, 'Error no controlado')
        return reply
            .code(500)
            .send({ statusCode: 500, error: 'Internal Server Error', code: 'INTERNAL_ERROR', message: 'Error interno del servidor' })
    })

    app.setNotFoundHandler((request, reply) =>
        reply.code(404).send({
            statusCode: 404,
            error: 'Not Found',
            code: 'NOT_FOUND',
            message: `Ruta ${request.method} ${request.url} no encontrada. Documentación en /docs`,
        })
    )

    const service = new TransactionService(options.repository, options.blockchain, app.log)
    app.get('/', { schema: { hide: true } }, (_request, reply) => reply.redirect('/docs'))
    await app.register(healthRoutes, {
        repository: options.repository,
        blockchain: options.blockchain,
        blockchainMode: options.blockchainMode,
    })
    await app.register(transactionRoutes, { service, apiKey: options.apiKey })

    return app
}
