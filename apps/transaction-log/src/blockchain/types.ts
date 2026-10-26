/** Datos de un hash sellado en la blockchain */
export type StampReceipt = {
    txHash: string
    blockNumber: number
    /** Timestamp del bloque: es la fecha que la blockchain certifica */
    blockTimestamp: Date
    contractAddress: string | null
}

/**
 * Lo que el servicio necesita de la blockchain. Hay dos implementaciones:
 * IsbeHashTimestampClient (red ISBE real o local) y MockBlockchainClient (en memoria).
 */
export interface BlockchainClient {
    /** Nombre de la red, se guarda en cada registro */
    readonly network: string
    readonly contractAddress: string | null
    /**
     * Registra el hash y espera a que la transacción quede confirmada en un bloque.
     * onSubmitted se llama en cuanto la transacción se ha enviado (antes de confirmarse),
     * para poder guardar su hash y reconciliar si la confirmación no llega.
     */
    stamp(hash: string, onSubmitted?: (txHash: string) => Promise<void>): Promise<StampReceipt>
    /** Fecha en la que se registró el hash, o null si no está en la cadena */
    getTimestamp(hash: string): Promise<Date | null>
    /**
     * Busca la transacción que registró el hash (para reconciliar reintentos), o null.
     * Si se conoce el hash de una transacción enviada antes, se comprueba esa primero.
     */
    findStamp(hash: string, knownTxHash?: string | null): Promise<StampReceipt | null>
    health(): Promise<{ ok: boolean; detail: string }>
    close(): Promise<void>
}

export type BlockchainErrorCode =
    | 'HASH_ALREADY_EXISTS'
    | 'MISSING_ROLE'
    | 'CONTRACT_PAUSED'
    | 'CONFIRMATION_TIMEOUT'
    | 'TRANSACTION_REVERTED'
    | 'BLOCKCHAIN_UNAVAILABLE'

export class BlockchainError extends Error {
    constructor(
        readonly code: BlockchainErrorCode,
        message: string,
        options?: { cause?: unknown }
    ) {
        super(message, options)
    }
}
