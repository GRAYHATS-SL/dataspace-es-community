/** Los tres campos que llegan en el JSON y que se hashean, exactamente con estos nombres */
export type TransactionFields = {
    id_product_order: string
    id_product_offer: string
    id_buyer: string
}

export type BlockchainStatus = 'pending' | 'confirmed' | 'failed'

/** Una operación del log, tal como la maneja el servicio (MongoDB la guarda con el estado blockchain anidado) */
export type TransactionRecord = TransactionFields & {
    hash: string
    salt: string
    hash_scheme: string
    created_at: Date
    updated_at: Date
    blockchain_status: BlockchainStatus
    blockchain_network: string
    contract_address: string | null
    tx_hash: string | null
    block_number: number | null
    block_timestamp: Date | null
    blockchain_error: string | null
}

export type NewTransaction = TransactionFields & {
    hash: string
    salt: string
    hash_scheme: string
    blockchain_network: string
    contract_address: string | null
}

/** Devuelve solo los campos que se hashean, en un objeto nuevo sin nada más */
export function pickFields(source: TransactionFields): TransactionFields {
    return {
        id_product_order: source.id_product_order,
        id_product_offer: source.id_product_offer,
        id_buyer: source.id_buyer,
    }
}

export class DuplicateOrderError extends Error {
    constructor(readonly existing: TransactionRecord) {
        super(`El pedido ${existing.id_product_order} ya está registrado con el hash ${existing.hash}`)
    }
}

export class NotFoundError extends Error {}
