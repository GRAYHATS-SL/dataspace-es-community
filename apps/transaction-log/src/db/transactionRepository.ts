import { MongoServerError, type Collection, type Db, type Filter } from 'mongodb'
import type { StampReceipt } from '../blockchain/types.js'
import {
    DuplicateOrderError,
    NotFoundError,
    type BlockchainStatus,
    type NewTransaction,
    type TransactionRecord,
} from '../domain/transaction.js'
import { TRANSACTION_COLLECTION, type TransactionDocument } from './mongoSchema.js'

export type ListFilter = {
    id_product_order?: string
    id_product_offer?: string
    id_buyer?: string
    blockchain_status?: BlockchainStatus
    limit: number
    offset: number
}

export interface TransactionRepository {
    /** Inserta en estado pending. Lanza DuplicateOrderError si el pedido ya existe */
    insertPending(transaction: NewTransaction): Promise<TransactionRecord>
    /** Guarda el hash de la transacción en cuanto se envía (el registro sigue pending) */
    markSubmitted(hash: string, txHash: string): Promise<void>
    markConfirmed(hash: string, receipt: StampReceipt): Promise<TransactionRecord>
    markFailed(hash: string, error: string): Promise<TransactionRecord>
    findByHash(hash: string): Promise<TransactionRecord | null>
    findByOrder(idProductOrder: string): Promise<TransactionRecord | null>
    list(filter: ListFilter): Promise<{ items: TransactionRecord[]; total: number }>
    ping(): Promise<void>
}

function toRecord(doc: TransactionDocument): TransactionRecord {
    const { _id, blockchain, ...fields } = doc
    return {
        ...fields,
        hash: _id,
        blockchain_status: blockchain.status,
        blockchain_network: blockchain.network,
        contract_address: blockchain.contract_address,
        tx_hash: blockchain.tx_hash,
        block_number: blockchain.block_number,
        block_timestamp: blockchain.block_timestamp,
        blockchain_error: blockchain.error,
    }
}

const DUPLICATE_KEY = 11000

export class MongoTransactionRepository implements TransactionRepository {
    private readonly collection: Collection<TransactionDocument>

    constructor(private readonly db: Db) {
        this.collection = db.collection<TransactionDocument>(TRANSACTION_COLLECTION)
    }

    async insertPending(t: NewTransaction): Promise<TransactionRecord> {
        const now = new Date()
        const doc: TransactionDocument = {
            _id: t.hash,
            id_product_order: t.id_product_order,
            id_product_offer: t.id_product_offer,
            id_buyer: t.id_buyer,
            salt: t.salt,
            hash_scheme: t.hash_scheme,
            created_at: now,
            updated_at: now,
            blockchain: {
                status: 'pending',
                network: t.blockchain_network,
                contract_address: t.contract_address,
                tx_hash: null,
                block_number: null,
                block_timestamp: null,
                error: null,
            },
        }
        try {
            await this.collection.insertOne(doc)
            return toRecord(doc)
        } catch (error) {
            // Dos peticiones simultáneas con el mismo pedido: gana la primera (índice único)
            if (error instanceof MongoServerError && error.code === DUPLICATE_KEY && error.keyPattern?.id_product_order) {
                const existing = await this.findByOrder(t.id_product_order)
                if (existing) throw new DuplicateOrderError(existing)
            }
            throw error
        }
    }

    async markSubmitted(hash: string, txHash: string): Promise<void> {
        await this.collection.updateOne(
            { _id: hash },
            { $set: { 'blockchain.status': 'pending', 'blockchain.tx_hash': txHash, updated_at: new Date() } }
        )
    }

    async markConfirmed(hash: string, receipt: StampReceipt): Promise<TransactionRecord> {
        return this.update(hash, {
            'blockchain.status': 'confirmed',
            'blockchain.tx_hash': receipt.txHash,
            'blockchain.block_number': receipt.blockNumber,
            'blockchain.block_timestamp': receipt.blockTimestamp,
            'blockchain.error': null,
            ...(receipt.contractAddress ? { 'blockchain.contract_address': receipt.contractAddress } : {}),
        })
    }

    async markFailed(hash: string, error: string): Promise<TransactionRecord> {
        return this.update(hash, { 'blockchain.status': 'failed', 'blockchain.error': error })
    }

    async findByHash(hash: string): Promise<TransactionRecord | null> {
        const doc = await this.collection.findOne({ _id: hash })
        return doc ? toRecord(doc) : null
    }

    async findByOrder(idProductOrder: string): Promise<TransactionRecord | null> {
        const doc = await this.collection.findOne({ id_product_order: idProductOrder })
        return doc ? toRecord(doc) : null
    }

    async list(filter: ListFilter): Promise<{ items: TransactionRecord[]; total: number }> {
        const query: Filter<TransactionDocument> = {}
        if (filter.id_product_order !== undefined) query.id_product_order = filter.id_product_order
        if (filter.id_product_offer !== undefined) query.id_product_offer = filter.id_product_offer
        if (filter.id_buyer !== undefined) query.id_buyer = filter.id_buyer
        if (filter.blockchain_status !== undefined) query['blockchain.status'] = filter.blockchain_status

        const [docs, total] = await Promise.all([
            this.collection.find(query).sort({ created_at: -1, _id: 1 }).skip(filter.offset).limit(filter.limit).toArray(),
            this.collection.countDocuments(query),
        ])
        return { items: docs.map(toRecord), total }
    }

    async ping(): Promise<void> {
        await this.db.command({ ping: 1 })
    }

    private async update(hash: string, changes: Record<string, unknown>): Promise<TransactionRecord> {
        const doc = await this.collection.findOneAndUpdate(
            { _id: hash },
            { $set: { ...changes, updated_at: new Date() } },
            { returnDocument: 'after' }
        )
        if (!doc) throw new NotFoundError(`No existe ningún registro con el hash ${hash}`)
        return toRecord(doc)
    }
}
