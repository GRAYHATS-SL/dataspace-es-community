import { MongoServerError, type Db, type IndexDescription } from 'mongodb'
import type { BlockchainStatus } from '../domain/transaction.js'

export const TRANSACTION_COLLECTION = 'transaction_log'

/** Documento de la colección transaction_log: una operación, identificada por su hash */
export type TransactionDocument = {
    _id: string
    id_product_order: string
    id_product_offer: string
    id_buyer: string
    salt: string
    hash_scheme: string
    created_at: Date
    updated_at: Date
    blockchain: {
        status: BlockchainStatus
        network: string
        contract_address: string | null
        tx_hash: string | null
        block_number: number | null
        block_timestamp: Date | null
        error: string | null
    }
}

const HEX_32 = '^0x[0-9a-f]{64}$'
const idField = (description: string) => ({ bsonType: 'string', minLength: 1, maxLength: 255, description })

/**
 * Validador $jsonSchema de la colección. Hace de esquema (MongoDB no tiene uno fijo):
 * rechaza documentos con campos de más o de menos, formatos incorrectos o estados
 * incoherentes, y documenta cada campo dentro de la propia base de datos.
 */
export const transactionValidator = {
    $jsonSchema: {
        bsonType: 'object',
        title: TRANSACTION_COLLECTION,
        description: 'Operaciones de pedido cuyo hash se ha sellado (o intentado sellar) en la blockchain',
        required: ['_id', 'id_product_order', 'id_product_offer', 'id_buyer', 'salt', 'hash_scheme', 'created_at', 'updated_at', 'blockchain'],
        additionalProperties: false,
        properties: {
            _id: {
                bsonType: 'string',
                pattern: HEX_32,
                description: 'Hash SHA-256(salt || JCS(json)) en hex con 0x. Identificador de la operación y valor registrado en la blockchain',
            },
            id_product_order: idField('Campo del JSON recibido. Único: un pedido solo se registra una vez'),
            id_product_offer: idField('Campo del JSON recibido'),
            id_buyer: idField('Campo del JSON recibido'),
            salt: {
                bsonType: 'string',
                pattern: HEX_32,
                description: '32 bytes aleatorios usados en el hash. Imprescindible para verificar; tratar como dato sensible',
            },
            hash_scheme: { bsonType: 'string', description: 'Versión de la receta de hash (sha256-jcs-salt32-v1)' },
            created_at: { bsonType: 'date', description: 'Momento en que el servicio recibió la operación' },
            updated_at: { bsonType: 'date', description: 'Última modificación del documento (cambios de estado blockchain)' },
            blockchain: {
                bsonType: 'object',
                description: 'Estado del sellado del hash en la blockchain',
                required: ['status', 'network', 'contract_address', 'tx_hash', 'block_number', 'block_timestamp', 'error'],
                additionalProperties: false,
                properties: {
                    status: {
                        enum: ['pending', 'confirmed', 'failed'],
                        description: 'pending: enviando; confirmed: sellado en un bloque; failed: error, se puede reintentar',
                    },
                    network: { bsonType: 'string', description: 'Red donde se registró, p. ej. "besu-local (chainId 11073)" o "mock"' },
                    contract_address: {
                        bsonType: ['string', 'null'],
                        description: 'Proxy HashTimestamp donde se registró el hash (null en modo mock)',
                    },
                    tx_hash: {
                        bsonType: ['string', 'null'],
                        pattern: HEX_32,
                        description: 'Hash de la transacción enviada; se guarda al enviarla, antes de confirmarse',
                    },
                    block_number: { bsonType: ['int', 'long', 'double', 'null'], description: 'Bloque en el que quedó registrada' },
                    block_timestamp: { bsonType: ['date', 'null'], description: 'Fecha del bloque: es la fecha que certifica la blockchain' },
                    error: { bsonType: ['string', 'null'], description: 'Último error al registrar en la blockchain (si status = failed)' },
                },
            },
        },
        // Un registro confirmed tiene que tener transacción, bloque y fecha de bloque
        anyOf: [
            { properties: { blockchain: { properties: { status: { enum: ['pending', 'failed'] } } } } },
            {
                properties: {
                    blockchain: {
                        properties: {
                            tx_hash: { bsonType: 'string' },
                            block_number: { bsonType: ['int', 'long', 'double'] },
                            block_timestamp: { bsonType: 'date' },
                        },
                    },
                },
            },
        ],
    },
}

export const transactionIndexes: IndexDescription[] = [
    { key: { id_product_order: 1 }, name: 'id_product_order_unique', unique: true },
    { key: { id_product_offer: 1 }, name: 'id_product_offer' },
    { key: { id_buyer: 1 }, name: 'id_buyer' },
    // Orden del listado: más recientes primero
    { key: { created_at: -1, _id: 1 }, name: 'created_at_desc' },
    { key: { 'blockchain.status': 1, created_at: -1 }, name: 'blockchain_status' },
]

const NAMESPACE_EXISTS = 48

/**
 * Crea la colección con su validador e índices, o los actualiza si ya existe.
 * Es idempotente: se puede ejecutar en cada arranque.
 */
export async function ensureSchema(db: Db, log: (message: string) => void = () => { }): Promise<void> {
    const options = { validator: transactionValidator, validationLevel: 'strict', validationAction: 'error' } as const
    const exists = await db.listCollections({ name: TRANSACTION_COLLECTION }, { nameOnly: true }).hasNext()
    let created = false
    if (!exists) {
        try {
            await db.createCollection(TRANSACTION_COLLECTION, options)
            created = true
        } catch (error) {
            // Otra instancia la creó a la vez
            if (!(error instanceof MongoServerError && error.code === NAMESPACE_EXISTS)) throw error
        }
    }
    if (!created) await db.command({ collMod: TRANSACTION_COLLECTION, ...options })
    await db.collection(TRANSACTION_COLLECTION).createIndexes(transactionIndexes)
    log(`Colección ${TRANSACTION_COLLECTION} ${created ? 'creada' : 'actualizada'} con su validador e índices`)
}
