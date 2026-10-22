import { Type } from 'typebox'

/*
 * Esquemas JSON (TypeBox) que se usan a la vez para validar las peticiones y
 * para generar la documentación OpenAPI/Swagger. Los que llevan $id se publican
 * en components.schemas y se referencian con Type.Ref.
 */

const HEX_32 = '^0x[0-9a-fA-F]{64}$'
// Sin espacios al principio ni al final: "ORD-1" y "ORD-1 " serían pedidos distintos
const TRIMMED = '^\\S(.*\\S)?$'

// Los ejemplos son una operación real registrada en la red besu local (bloque 19803):
// el ejemplo de POST /transactions/verify devuelve verified = true contra esa red.
const EXAMPLE_INPUT = {
    id_product_order: 'ORD-DEMO-0001',
    id_product_offer: 'OFF-500',
    id_buyer: 'BUY-777',
}
const EXAMPLE_HASH = '0xa5afb113865f4c52edc0e260254deacafb729a6af6d83481e13d32e498156e3b'
const EXAMPLE_SALT = '0x839ba520aefeb7ce9678eb26a2e88db9a7cd30153b76e794acbb0d6bd57b0990'
const EXAMPLE_BLOCKCHAIN = {
    status: 'confirmed',
    network: 'besu-local (chainId 11073)',
    contract_address: '0x98717d1775AE066A18fad55142A5A85EbfA3E067',
    tx_hash: '0x945e3ce61c18ff98cbda193b8a6c401d54aa4db05f57d6b6b6c640e52171ec6c',
    block_number: 19803,
    block_timestamp: '2026-10-15T15:29:09.000Z',
    error: null,
}
const EXAMPLE_RECORD = {
    hash: EXAMPLE_HASH,
    ...EXAMPLE_INPUT,
    salt: EXAMPLE_SALT,
    hash_scheme: 'sha256-jcs-salt32-v1',
    created_at: '2026-10-15T15:29:07.929Z',
    updated_at: '2026-10-15T15:29:09.270Z',
    blockchain: EXAMPLE_BLOCKCHAIN,
}

function idField(description: string, example: string) {
    return Type.String({ minLength: 1, maxLength: 255, pattern: TRIMMED, description, examples: [example] })
}

const fields = {
    id_product_order: idField(
        'Identificador del pedido. Es único: un mismo pedido solo se puede registrar una vez (un segundo envío devuelve 409).',
        EXAMPLE_INPUT.id_product_order
    ),
    id_product_offer: idField('Identificador de la oferta de producto.', EXAMPLE_INPUT.id_product_offer),
    id_buyer: idField('Identificador del comprador.', EXAMPLE_INPUT.id_buyer),
}

export const HashParam = Type.String({
    pattern: HEX_32,
    description: 'Hash de la operación: 0x + 64 caracteres hexadecimales (se aceptan mayúsculas, se normaliza a minúsculas).',
    examples: [EXAMPLE_HASH],
})

// ---------------------------------------------------------------- Entradas

export const TransactionInput = Type.Object(fields, {
    title: 'TransactionInput',
    additionalProperties: false,
    description:
        'Operación a registrar. Deben venir exactamente estos tres campos, todos strings no vacíos de hasta 255 caracteres, ' +
        'sin espacios al principio ni al final. Cualquier campo adicional se rechaza con 400, porque el hash se calcula ' +
        'exactamente sobre estos tres campos.',
    examples: [EXAMPLE_INPUT],
})

export const VerifyPayloadInput = Type.Object(
    {
        ...fields,
        salt: Type.String({
            pattern: HEX_32,
            description: 'Salt con el que se calculó el hash (32 bytes en hex con prefijo 0x), tal como lo devolvió el registro.',
            examples: [EXAMPLE_SALT],
        }),
    },
    {
        title: 'VerifyPayloadInput',
        additionalProperties: false,
        description:
            'Datos de una operación + su salt, aportados por quien quiere verificarla (p. ej. un auditor). El servicio recalcula ' +
            'el hash y lo busca en la blockchain sin fiarse del log.',
        examples: [{ ...EXAMPLE_INPUT, salt: EXAMPLE_SALT }],
    }
)

export const ListQuery = Type.Object(
    {
        id_product_order: Type.Optional(idField('Filtra por pedido (coincidencia exacta).', EXAMPLE_INPUT.id_product_order)),
        id_product_offer: Type.Optional(idField('Filtra por oferta (coincidencia exacta).', EXAMPLE_INPUT.id_product_offer)),
        id_buyer: Type.Optional(idField('Filtra por comprador (coincidencia exacta).', EXAMPLE_INPUT.id_buyer)),
        status: Type.Optional(
            Type.Union([Type.Literal('pending'), Type.Literal('confirmed'), Type.Literal('failed')], {
                description: 'Filtra por estado en la blockchain.',
            })
        ),
        limit: Type.Integer({ minimum: 1, maximum: 100, default: 20, description: 'Número máximo de resultados (1-100).' }),
        offset: Type.Integer({ minimum: 0, default: 0, description: 'Resultados a saltar, para paginar.' }),
    },
    { additionalProperties: false }
)

// ---------------------------------------------------------------- Salidas

const nullable = <T extends Parameters<typeof Type.Union>[0][number]>(schema: T, description: string) =>
    Type.Union([schema, Type.Null()], { description })

export const BlockchainInfo = Type.Object(
    {
        status: Type.Union([Type.Literal('pending'), Type.Literal('confirmed'), Type.Literal('failed')], {
            description:
                '`pending`: guardado y enviándose a la blockchain. `confirmed`: sellado en un bloque. ' +
                '`failed`: la blockchain falló; el registro existe y se puede reintentar con POST /transactions/{hash}/retry.',
        }),
        network: Type.String({
            description: 'Red en la que se registró. "mock" significa blockchain simulada (sin valor probatorio).',
            examples: ['besu-local (chainId 11073)'],
        }),
        contract_address: nullable(
            Type.String({ examples: ['0x98717d1775AE066A18fad55142A5A85EbfA3E067'] }),
            'Proxy HashTimestamp donde está registrado el hash. null en modo mock.'
        ),
        tx_hash: nullable(
            Type.String(),
            'Hash de la transacción enviada a la blockchain. Se guarda en cuanto se envía, así que puede tener valor ' +
            'aunque status sea pending o failed (p. ej. tras un CONFIRMATION_TIMEOUT); null si nunca se llegó a enviar.'
        ),
        block_number: nullable(Type.Integer(), 'Bloque en el que quedó registrado. null si no está confirmado.'),
        block_timestamp: nullable(
            Type.String({ format: 'date-time' }),
            'Fecha del bloque (UTC): es la fecha que certifica la blockchain. null si no está confirmado.'
        ),
        error: nullable(Type.String(), 'Último error al registrar en la blockchain (si status = failed).'),
    },
    { $id: 'BlockchainInfo', title: 'BlockchainInfo', description: 'Estado del sellado del hash en la blockchain.', examples: [EXAMPLE_BLOCKCHAIN] }
)

export const TransactionResponse = Type.Object(
    {
        hash: Type.String({
            description: 'Identificador de la operación: SHA-256(salt || JCS(json)) en hex con prefijo 0x. Es el valor registrado en la blockchain.',
            examples: [EXAMPLE_HASH],
        }),
        id_product_order: Type.String({ description: 'Pedido, tal como llegó.' }),
        id_product_offer: Type.String({ description: 'Oferta, tal como llegó.' }),
        id_buyer: Type.String({ description: 'Comprador, tal como llegó.' }),
        salt: Type.String({
            description:
                'Salt aleatorio de 32 bytes usado en el hash. Imprescindible para verificar la operación en el futuro. ' +
                'Trátalo como dato sensible: con el salt y el hash público se pueden comprobar valores candidatos de los campos.',
            examples: [EXAMPLE_SALT],
        }),
        hash_scheme: Type.String({
            description: 'Versión de la receta de hash. Ver la sección "Cómo se calcula el hash".',
            examples: ['sha256-jcs-salt32-v1'],
        }),
        created_at: Type.String({ format: 'date-time', description: 'Momento (UTC) en que el servicio recibió la operación.' }),
        updated_at: Type.String({ format: 'date-time', description: 'Última modificación del registro (UTC).' }),
        blockchain: Type.Ref('BlockchainInfo'),
    },
    { $id: 'TransactionResponse', title: 'TransactionResponse', description: 'Registro de una operación en el log.', examples: [EXAMPLE_RECORD] }
)

export const TransactionList = Type.Object(
    {
        items: Type.Array(Type.Ref('TransactionResponse'), { description: 'Registros, del más reciente al más antiguo.' }),
        total: Type.Integer({ description: 'Total de registros que cumplen el filtro (sin paginar).' }),
        limit: Type.Integer(),
        offset: Type.Integer(),
    },
    { $id: 'TransactionList', title: 'TransactionList', examples: [{ items: [EXAMPLE_RECORD], total: 1, limit: 20, offset: 0 }] }
)

export const VerificationResponse = Type.Object(
    {
        hash: Type.String({ description: 'Hash comprobado.' }),
        verified: Type.Boolean({
            description:
                'true si la operación queda demostrada: el hash está en la blockchain (y, al verificar un registro del log, ' +
                'además los datos guardados reproducen el hash).',
        }),
        hash_matches: nullable(
            Type.Boolean(),
            'Solo al verificar un registro del log: true si recalcular el hash con los campos y el salt guardados da el mismo hash ' +
            '(false indicaría que el registro de la base de datos se ha alterado). null al verificar datos aportados.'
        ),
        on_chain: Type.Boolean({ description: 'true si el hash está registrado en la blockchain consultada.' }),
        on_chain_timestamp: nullable(
            Type.String({ format: 'date-time' }),
            'Fecha (UTC) que la blockchain certifica para el hash. null si no está registrado.'
        ),
        registered_in_log: Type.Boolean({ description: 'true si existe un registro con ese hash en el log de este servicio.' }),
        checked_network: Type.String({ description: 'Red blockchain consultada en esta verificación.' }),
        record: Type.Union([Type.Ref('TransactionResponse'), Type.Null()], {
            description: 'Registro del log con ese hash, si existe.',
        }),
    },
    {
        $id: 'VerificationResponse',
        title: 'VerificationResponse',
        examples: [
            {
                hash: EXAMPLE_HASH,
                verified: true,
                hash_matches: true,
                on_chain: true,
                on_chain_timestamp: EXAMPLE_BLOCKCHAIN.block_timestamp,
                registered_in_log: true,
                checked_network: EXAMPLE_BLOCKCHAIN.network,
                record: EXAMPLE_RECORD,
            },
        ],
    }
)

export const ErrorResponse = Type.Object(
    {
        statusCode: Type.Integer({ examples: [409] }),
        error: Type.String({ description: 'Texto estándar del código HTTP.', examples: ['Conflict'] }),
        code: Type.String({
            description:
                'Código estable para tratar el error por programa: VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, DUPLICATE_ORDER, ' +
                'HASH_ALREADY_EXISTS, MISSING_ROLE, CONTRACT_PAUSED, CONFIRMATION_TIMEOUT, TRANSACTION_REVERTED, ' +
                'BLOCKCHAIN_UNAVAILABLE, INTERNAL_ERROR.',
            examples: ['DUPLICATE_ORDER'],
        }),
        message: Type.String({ description: 'Descripción legible del error.' }),
        record: Type.Optional(
            Type.Ref('TransactionResponse', {
                description: 'En 409: el registro que ya existe. En 502: el registro guardado en estado failed.',
            })
        ),
    },
    {
        $id: 'ErrorResponse',
        title: 'ErrorResponse',
        description: 'Formato común de todas las respuestas de error.',
        examples: [
            {
                statusCode: 409,
                error: 'Conflict',
                code: 'DUPLICATE_ORDER',
                message: `El pedido ${EXAMPLE_INPUT.id_product_order} ya está registrado con el hash ${EXAMPLE_HASH}`,
                record: EXAMPLE_RECORD,
            },
        ],
    }
)

export const HealthResponse = Type.Object(
    {
        status: Type.Union([Type.Literal('ok'), Type.Literal('degraded')], {
            description: '"ok" si base de datos y blockchain responden; "degraded" si alguna falla (HTTP 503).',
        }),
        database: Type.Object({ ok: Type.Boolean(), detail: Type.String() }),
        blockchain: Type.Object({
            ok: Type.Boolean(),
            mode: Type.Union([Type.Literal('real'), Type.Literal('mock')]),
            network: Type.String(),
            detail: Type.String(),
        }),
    },
    { $id: 'HealthResponse', title: 'HealthResponse' }
)

/** Esquemas compartidos que hay que registrar con app.addSchema antes de las rutas */
export const sharedSchemas = [
    BlockchainInfo,
    TransactionResponse,
    TransactionList,
    VerificationResponse,
    ErrorResponse,
    HealthResponse,
]

export const errorRef = (description: string) => Type.Ref('ErrorResponse', { description })
