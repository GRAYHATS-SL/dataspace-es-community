import type { TransactionRecord } from '../domain/transaction.js'
import type { VerificationResult } from '../services/transactionService.js'

/** Convierte un registro del log al formato TransactionResponse de la API */
export function presentTransaction(record: TransactionRecord) {
    return {
        hash: record.hash,
        id_product_order: record.id_product_order,
        id_product_offer: record.id_product_offer,
        id_buyer: record.id_buyer,
        salt: record.salt,
        hash_scheme: record.hash_scheme,
        created_at: record.created_at.toISOString(),
        updated_at: record.updated_at.toISOString(),
        blockchain: {
            status: record.blockchain_status,
            network: record.blockchain_network,
            contract_address: record.contract_address,
            tx_hash: record.tx_hash,
            block_number: record.block_number,
            block_timestamp: record.block_timestamp?.toISOString() ?? null,
            error: record.blockchain_error,
        },
    }
}

export function presentVerification(result: VerificationResult) {
    return {
        ...result,
        on_chain_timestamp: result.on_chain_timestamp?.toISOString() ?? null,
        record: result.record ? presentTransaction(result.record) : null,
    }
}
