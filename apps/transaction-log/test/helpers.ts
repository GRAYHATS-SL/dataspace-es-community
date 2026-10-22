import { buildApp } from '../src/app.js'
import { MockBlockchainClient } from '../src/blockchain/mockClient.js'
import { BlockchainError, type StampReceipt } from '../src/blockchain/types.js'
import type { ListFilter, TransactionRepository } from '../src/db/transactionRepository.js'
import { DuplicateOrderError, type NewTransaction, type TransactionRecord } from '../src/domain/transaction.js'

/** Repositorio en memoria con el mismo comportamiento que PgTransactionRepository */
export class InMemoryTransactionRepository implements TransactionRepository {
    readonly rows = new Map<string, TransactionRecord>()

    async insertPending(t: NewTransaction): Promise<TransactionRecord> {
        const existing = await this.findByOrder(t.id_product_order)
        if (existing) throw new DuplicateOrderError(existing)
        const now = new Date()
        const record: TransactionRecord = {
            ...t,
            created_at: now,
            updated_at: now,
            blockchain_status: 'pending',
            tx_hash: null,
            block_number: null,
            block_timestamp: null,
            blockchain_error: null,
        }
        this.rows.set(t.hash, record)
        return { ...record }
    }

    async markSubmitted(hash: string, txHash: string): Promise<void> {
        this.update(hash, { blockchain_status: 'pending', tx_hash: txHash })
    }

    async markConfirmed(hash: string, receipt: StampReceipt): Promise<TransactionRecord> {
        return this.update(hash, {
            blockchain_status: 'confirmed',
            tx_hash: receipt.txHash,
            block_number: receipt.blockNumber,
            block_timestamp: receipt.blockTimestamp,
            contract_address: receipt.contractAddress ?? this.rows.get(hash)!.contract_address,
            blockchain_error: null,
        })
    }

    async markFailed(hash: string, error: string): Promise<TransactionRecord> {
        return this.update(hash, { blockchain_status: 'failed', blockchain_error: error })
    }

    async findByHash(hash: string) {
        const row = this.rows.get(hash)
        return row ? { ...row } : null
    }

    async findByOrder(idProductOrder: string) {
        const row = [...this.rows.values()].find((r) => r.id_product_order === idProductOrder)
        return row ? { ...row } : null
    }

    async list(filter: ListFilter) {
        const matches = [...this.rows.values()]
            .filter(
                (r) =>
                    (filter.id_product_order === undefined || r.id_product_order === filter.id_product_order) &&
                    (filter.id_product_offer === undefined || r.id_product_offer === filter.id_product_offer) &&
                    (filter.id_buyer === undefined || r.id_buyer === filter.id_buyer) &&
                    (filter.blockchain_status === undefined || r.blockchain_status === filter.blockchain_status)
            )
            .reverse()
        return { items: matches.slice(filter.offset, filter.offset + filter.limit), total: matches.length }
    }

    async ping() {}

    private update(hash: string, changes: Partial<TransactionRecord>): TransactionRecord {
        const record = { ...this.rows.get(hash)!, ...changes, updated_at: new Date() }
        this.rows.set(hash, record)
        return { ...record }
    }
}

/** Blockchain simulada a la que se le puede ordenar que falle */
export class ControllableBlockchain extends MockBlockchainClient {
    failure: BlockchainError | null = null
    /** Simula que la transacción llega a la cadena pero la confirmación no llega a tiempo */
    timeoutAfterStamp = false

    override async stamp(hash: string, onSubmitted?: (txHash: string) => Promise<void>) {
        if (this.failure) throw this.failure
        const receipt = await super.stamp(hash, onSubmitted)
        if (this.timeoutAfterStamp) throw new BlockchainError('CONFIRMATION_TIMEOUT', 'Simulado: confirmación no recibida')
        return receipt
    }
}

export async function createTestApp(options: { apiKey?: string } = {}) {
    const repository = new InMemoryTransactionRepository()
    const blockchain = new ControllableBlockchain()
    const app = await buildApp({ repository, blockchain, blockchainMode: 'mock', apiKey: options.apiKey })
    return { app, repository, blockchain }
}

export const validInput = {
    id_product_order: 'ORD-2026-000123',
    id_product_offer: 'OFF-7781',
    id_buyer: 'BUY-00042',
}
