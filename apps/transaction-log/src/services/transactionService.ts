import type { FastifyBaseLogger } from 'fastify'
import { BlockchainError, type BlockchainClient } from '../blockchain/types.js'
import type { ListFilter, TransactionRepository } from '../db/transactionRepository.js'
import {
    DuplicateOrderError,
    NotFoundError,
    pickFields,
    type TransactionFields,
    type TransactionRecord,
} from '../domain/transaction.js'
import { HASH_SCHEME, generateSalt, hashJson } from '../hashing/jsonHash.js'

/** El registro se guardó pero la blockchain falló; el registro queda en estado failed */
export class ChainRegistrationError extends Error {
    constructor(
        readonly record: TransactionRecord,
        readonly chainError: BlockchainError
    ) {
        super(chainError.message, { cause: chainError })
    }
}

export type VerificationResult = {
    hash: string
    verified: boolean
    hash_matches: boolean | null
    on_chain: boolean
    on_chain_timestamp: Date | null
    registered_in_log: boolean
    checked_network: string
    record: TransactionRecord | null
}

export class TransactionService {
    constructor(
        private readonly repository: TransactionRepository,
        private readonly blockchain: BlockchainClient,
        private readonly log: FastifyBaseLogger
    ) {}

    /**
     * Flujo completo: hash con salt nuevo → registro pending → sellado en blockchain →
     * registro confirmed. Si la blockchain falla, el registro queda failed y se lanza
     * ChainRegistrationError (se puede reintentar con retry()).
     */
    async register(input: TransactionFields): Promise<TransactionRecord> {
        const fields = pickFields(input)
        const existing = await this.repository.findByOrder(fields.id_product_order)
        if (existing) throw new DuplicateOrderError(existing)

        const salt = generateSalt()
        const { hash } = hashJson(fields, salt)
        const record = await this.repository.insertPending({
            ...fields,
            hash,
            salt,
            hash_scheme: HASH_SCHEME,
            blockchain_network: this.blockchain.network,
            contract_address: this.blockchain.contractAddress,
        })
        this.log.info({ hash, id_product_order: fields.id_product_order }, 'Operación guardada, sellando en blockchain')
        return this.stampOnChain(record)
    }

    /** Reintenta el sellado de un registro failed o pending. Si ya está confirmado lo devuelve tal cual */
    async retry(hash: string): Promise<TransactionRecord> {
        const record = await this.get(hash)
        if (record.blockchain_status === 'confirmed') return record

        // Puede que un intento anterior llegara a la cadena aunque no recibiéramos la confirmación
        let previous
        try {
            previous = await this.blockchain.findStamp(hash, record.tx_hash)
        } catch (error) {
            if (error instanceof BlockchainError) throw new ChainRegistrationError(record, error)
            throw error
        }
        if (previous) {
            this.log.info({ hash, txHash: previous.txHash }, 'El hash ya estaba en la blockchain; se reconcilia el registro')
            return this.repository.markConfirmed(hash, previous)
        }
        return this.stampOnChain(record)
    }

    async get(hash: string): Promise<TransactionRecord> {
        const record = await this.repository.findByHash(hash)
        if (!record) throw new NotFoundError(`No existe ningún registro con el hash ${hash}`)
        return record
    }

    list(filter: ListFilter) {
        return this.repository.list(filter)
    }

    /** Verifica un registro del log: recalcula el hash con sus datos y salt, y lo busca en la blockchain */
    async verifyRecord(hash: string): Promise<VerificationResult> {
        const record = await this.get(hash)
        const recomputed = hashJson(pickFields(record), record.salt).hash
        const onChainTimestamp = await this.blockchain.getTimestamp(hash)
        const hashMatches = recomputed === record.hash
        return {
            hash,
            verified: hashMatches && onChainTimestamp !== null,
            hash_matches: hashMatches,
            on_chain: onChainTimestamp !== null,
            on_chain_timestamp: onChainTimestamp,
            registered_in_log: true,
            checked_network: this.blockchain.network,
            record,
        }
    }

    /**
     * Verifica unos datos aportados por un tercero (los tres campos + salt), sin
     * fiarse del log: calcula el hash y lo busca en la blockchain.
     */
    async verifyPayload(input: TransactionFields & { salt: string }): Promise<VerificationResult> {
        const { hash } = hashJson(pickFields(input), input.salt.toLowerCase())
        const [onChainTimestamp, record] = await Promise.all([
            this.blockchain.getTimestamp(hash),
            this.repository.findByHash(hash),
        ])
        return {
            hash,
            verified: onChainTimestamp !== null,
            hash_matches: null,
            on_chain: onChainTimestamp !== null,
            on_chain_timestamp: onChainTimestamp,
            registered_in_log: record !== null,
            checked_network: this.blockchain.network,
            record,
        }
    }

    private async stampOnChain(record: TransactionRecord): Promise<TransactionRecord> {
        let submittedTx = record.tx_hash
        try {
            const receipt = await this.blockchain.stamp(record.hash, async (txHash) => {
                submittedTx = txHash
                await this.repository.markSubmitted(record.hash, txHash)
            })
            this.log.info({ hash: record.hash, txHash: receipt.txHash, block: receipt.blockNumber }, 'Hash sellado en blockchain')
            return await this.repository.markConfirmed(record.hash, receipt)
        } catch (error) {
            const chainError =
                error instanceof BlockchainError
                    ? error
                    : new BlockchainError('BLOCKCHAIN_UNAVAILABLE', (error as Error).message, { cause: error })

            if (chainError.code === 'HASH_ALREADY_EXISTS') {
                const previous = await this.blockchain.findStamp(record.hash, submittedTx).catch(() => null)
                if (previous) return this.repository.markConfirmed(record.hash, previous)
            }
            this.log.warn({ hash: record.hash, code: chainError.code, err: chainError }, 'Fallo al sellar en blockchain')
            const failed = await this.repository.markFailed(record.hash, `${chainError.code}: ${chainError.message}`)
            throw new ChainRegistrationError(failed, chainError)
        }
    }
}
