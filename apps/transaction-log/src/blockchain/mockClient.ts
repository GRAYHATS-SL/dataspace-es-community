import { randomBytes } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { BlockchainError, type BlockchainClient, type StampReceipt } from './types.js'

/**
 * Blockchain simulada en memoria para trabajar sin red. Reproduce el
 * comportamiento de HashTimestamp (un hash solo se puede registrar una vez), pero
 * los datos se pierden al reiniciar el proceso: no sirve como prueba de nada.
 */
export class MockBlockchainClient implements BlockchainClient {
    readonly network = 'mock'
    readonly contractAddress = null
    private readonly stamps = new Map<string, StampReceipt>()
    private blockNumber = 0

    constructor(private readonly latencyMs = 0) { }

    async stamp(hash: string, onSubmitted?: (txHash: string) => Promise<void>): Promise<StampReceipt> {
        if (this.stamps.has(hash))
            throw new BlockchainError('HASH_ALREADY_EXISTS', 'El hash ya está registrado en la blockchain')
        const txHash = '0x' + randomBytes(32).toString('hex')
        await onSubmitted?.(txHash)
        if (this.latencyMs > 0) await sleep(this.latencyMs)
        const receipt: StampReceipt = {
            txHash,
            blockNumber: ++this.blockNumber,
            blockTimestamp: new Date(Math.floor(Date.now() / 1000) * 1000),
            contractAddress: null,
        }
        this.stamps.set(hash, receipt)
        return receipt
    }

    async getTimestamp(hash: string): Promise<Date | null> {
        return this.stamps.get(hash)?.blockTimestamp ?? null
    }

    async findStamp(hash: string): Promise<StampReceipt | null> {
        return this.stamps.get(hash) ?? null
    }

    async health(): Promise<{ ok: boolean; detail: string }> {
        return { ok: true, detail: `Simulada en memoria (${this.stamps.size} hashes); se pierde al reiniciar` }
    }

    async close(): Promise<void> { }
}
