import { Contract, FetchRequest, JsonRpcProvider, Wallet, isError, type EventLog } from 'ethers'
import type { RealBlockchainConfig } from '../config.js'
import { BlockchainError, type BlockchainClient, type StampReceipt } from './types.js'
import hashTimestampAbi from './abi/HashTimestamp.json' with { type: 'json' }

/**
 * Cliente del caso de uso HashTimestamp de ISBE (plantilla oficial de
 * @red-isbe/isbe-contracts) a través de su proxy.
 *
 * Las transacciones se envían de una en una desde este proceso, con un contador de
 * nonces propio; la espera de confirmación sí es concurrente. Si se despliegan
 * varias instancias del servicio, cada una debe usar su propia cuenta.
 */
export class BlockchainHashTimestampClient implements BlockchainClient {
    readonly network: string
    readonly contractAddress: string
    private readonly provider: JsonRpcProvider
    private readonly wallet: Wallet
    private readonly contract: Contract
    private readonly confirmationTimeoutMs: number
    private sendQueue: Promise<unknown> = Promise.resolve()
    private nextNonce: number | null = null

    constructor(config: RealBlockchainConfig) {
        const request = new FetchRequest(config.rpcUrl)
        request.timeout = config.rpcTimeoutMs
        this.provider = new JsonRpcProvider(request, config.chainId, {
            staticNetwork: true,
            pollingInterval: 500,
        })
        this.wallet = new Wallet(config.privateKey, this.provider)
        this.contract = new Contract(config.contractAddress, hashTimestampAbi, this.wallet)
        this.contractAddress = config.contractAddress
        this.network = `${config.networkName} (chainId ${config.chainId})`
        this.confirmationTimeoutMs = config.confirmationTimeoutMs
    }

    async stamp(hash: string, onSubmitted?: (txHash: string) => Promise<void>): Promise<StampReceipt> {
        const tx = await this.serialize(() => this.send(hash))
        await onSubmitted?.(tx.hash)

        let receipt
        try {
            receipt = await tx.wait(1, this.confirmationTimeoutMs)
        } catch (error) {
            if (isError(error, 'TIMEOUT'))
                throw new BlockchainError(
                    'CONFIRMATION_TIMEOUT',
                    `La transacción ${tx.hash} no se confirmó en ${this.confirmationTimeoutMs} ms; puede confirmarse más tarde`,
                    { cause: error }
                )
            throw this.translate(error)
        }
        if (!receipt || receipt.status !== 1)
            throw new BlockchainError('TRANSACTION_REVERTED', `La transacción ${tx.hash} fue revertida`)

        return this.toReceipt(receipt.hash, receipt.blockNumber)
    }

    async getTimestamp(hash: string): Promise<Date | null> {
        try {
            const seconds: bigint = await this.contract.getTimestamp(hash)
            return seconds === 0n ? null : new Date(Number(seconds) * 1000)
        } catch (error) {
            throw this.translate(error)
        }
    }

    async findStamp(hash: string, knownTxHash?: string | null): Promise<StampReceipt | null> {
        try {
            if (knownTxHash) {
                const receipt = await this.provider.getTransactionReceipt(knownTxHash)
                if (receipt?.status === 1) return await this.toReceipt(receipt.hash, receipt.blockNumber)
            }
            const timestamp = await this.getTimestamp(hash)
            if (!timestamp) return null

            // Los nodos limitan el rango de eth_getLogs (Besu: 5000 bloques), así que no se
            // puede buscar el evento desde el bloque 0. El contrato da la fecha del bloque:
            // se localiza por búsqueda binaria y se buscan los eventos solo alrededor de él.
            const fromBlock = await this.firstBlockAtOrAfter(timestamp.getTime() / 1000)
            const events = await this.contract.queryFilter(
                this.contract.filters.HashTimestamped(hash),
                fromBlock,
                fromBlock + 10
            )
            const event = events[0] as EventLog | undefined
            return event ? await this.toReceipt(event.transactionHash, event.blockNumber) : null
        } catch (error) {
            throw this.translate(error)
        }
    }

    async health(): Promise<{ ok: boolean; detail: string }> {
        try {
            const [blockNumber, code] = await Promise.all([
                this.provider.getBlockNumber(),
                this.provider.getCode(this.contractAddress),
            ])
            if (code === '0x')
                return { ok: false, detail: `No hay contrato en ${this.contractAddress} (bloque ${blockNumber})` }
            return { ok: true, detail: `Bloque actual ${blockNumber}, cuenta ${this.wallet.address}` }
        } catch (error) {
            return { ok: false, detail: this.translate(error).message }
        }
    }

    async close(): Promise<void> {
        this.provider.destroy()
    }

    /** Primer bloque cuyo timestamp es >= target (segundos). Las fechas de bloque son crecientes */
    private async firstBlockAtOrAfter(targetSeconds: number): Promise<number> {
        let low = 0
        let high = await this.provider.getBlockNumber()
        while (low < high) {
            const middle = Math.floor((low + high) / 2)
            const block = await this.provider.getBlock(middle)
            if (!block) throw new BlockchainError('BLOCKCHAIN_UNAVAILABLE', `No se pudo leer el bloque ${middle}`)
            if (block.timestamp < targetSeconds) low = middle + 1
            else high = middle
        }
        return low
    }

    private async toReceipt(txHash: string, blockNumber: number): Promise<StampReceipt> {
        const block = await this.provider.getBlock(blockNumber)
        if (!block) throw new BlockchainError('BLOCKCHAIN_UNAVAILABLE', `No se pudo leer el bloque ${blockNumber}`)
        return {
            txHash,
            blockNumber,
            blockTimestamp: new Date(block.timestamp * 1000),
            contractAddress: this.contractAddress,
        }
    }

    /**
     * Envía la transacción con el siguiente nonce. El contador se lleva en memoria
     * porque Besu tarda unos milisegundos en reflejar las transacciones recién
     * enviadas en eth_getTransactionCount('pending'), y dos envíos seguidos
     * acabarían con el mismo nonce. Si aun así choca (otro proceso usando la misma
     * cuenta), se resincroniza con el nodo y se reintenta.
     */
    private async send(hash: string) {
        for (let attempt = 1; ; attempt++) {
            let nonce = -1
            try {
                this.nextNonce ??= await this.provider.getTransactionCount(this.wallet.address, 'pending')
                nonce = this.nextNonce
                const tx = await this.contract.timestampHash(hash, { nonce, ...(await this.feeOverrides()) })
                this.nextNonce = nonce + 1
                return tx
            } catch (error) {
                const nonceTaken = isError(error, 'NONCE_EXPIRED') || isError(error, 'REPLACEMENT_UNDERPRICED')
                if (!nonceTaken || attempt >= 3) {
                    // Un error de red al enviar deja dudas sobre si el nonce se gastó: resincronizar
                    if (!isError(error, 'CALL_EXCEPTION')) this.nextNonce = null
                    throw this.translate(error)
                }
                const pending = await this.provider.getTransactionCount(this.wallet.address, 'pending')
                this.nextNonce = Math.max(pending, nonce + 1)
            }
        }
    }

    /**
     * Besu anuncia su precio mínimo en eth_gasPrice, pero ethers propone una propina
     * (priority fee) de 0. Con propina 0 la transacción tarda ~4 bloques en entrar;
     * usando eth_gasPrice como propina entra en el siguiente bloque (~2 s en ISBE).
     */
    private async feeOverrides() {
        const fees = await this.provider.getFeeData()
        if (fees.maxFeePerGas === null || fees.gasPrice === null) return {}
        const block = await this.provider.getBlock('latest')
        const priority = fees.gasPrice > (fees.maxPriorityFeePerGas ?? 0n) ? fees.gasPrice : fees.maxPriorityFeePerGas!
        return { maxPriorityFeePerGas: priority, maxFeePerGas: (block?.baseFeePerGas ?? 0n) * 2n + priority }
    }

    private serialize<T>(task: () => Promise<T>): Promise<T> {
        const run = this.sendQueue.then(task, task)
        this.sendQueue = run.catch(() => undefined)
        return run
    }

    private decodeRevert(data: string | null | undefined): string | undefined {
        if (!data || data === '0x') return undefined
        try {
            return this.contract.interface.parseError(data)?.name
        } catch {
            return undefined
        }
    }

    /** Traduce errores de ethers/contrato a BlockchainError con un código estable */
    private translate(error: unknown): BlockchainError {
        if (error instanceof BlockchainError) return error
        if (isError(error, 'CALL_EXCEPTION')) {
            // ethers no siempre decodifica el error personalizado (p. ej. al estimar gas): se hace con el ABI
            const revertName = error.revert?.name ?? this.decodeRevert(error.data)
            switch (revertName) {
                case 'HashAlreadyExists':
                    return new BlockchainError('HASH_ALREADY_EXISTS', 'El hash ya está registrado en la blockchain', { cause: error })
                case 'AccountHasNoRole':
                    return new BlockchainError(
                        'MISSING_ROLE',
                        `La cuenta ${this.wallet.address} no tiene HASH_TIMESTAMP_ROLE en el proxy ${this.contractAddress}`,
                        { cause: error }
                    )
                case 'IsPaused':
                    return new BlockchainError('CONTRACT_PAUSED', 'El contrato HashTimestamp está pausado', { cause: error })
            }
            return new BlockchainError(
                'TRANSACTION_REVERTED',
                `La blockchain rechazó la operación: ${revertName ?? error.shortMessage}`,
                { cause: error }
            )
        }
        const message = error instanceof Error ? (error as { shortMessage?: string }).shortMessage ?? error.message : String(error)
        return new BlockchainError('BLOCKCHAIN_UNAVAILABLE', `No se pudo contactar con la blockchain: ${message}`, { cause: error })
    }
}
