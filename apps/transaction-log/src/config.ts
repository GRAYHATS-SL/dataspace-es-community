import { config as loadDotenv } from 'dotenv'

loadDotenv({ quiet: true })

export type RealBlockchainConfig = {
    mode: 'real'
    /** Nombre legible que se guarda en cada registro (p. ej. "besu-local", "isbe-pre") */
    networkName: string
    rpcUrl: string
    chainId: number
    /** Dirección del proxy HashTimestamp desplegado */
    contractAddress: string
    /** Clave de la cuenta con HASH_TIMESTAMP_ROLE. En producción: KMS, nunca una clave en claro */
    privateKey: string
    /** Tiempo máximo que el endpoint espera la confirmación de la transacción */
    confirmationTimeoutMs: number
    /** Tiempo máximo de cada petición JSON-RPC */
    rpcTimeoutMs: number
}

export type MockBlockchainConfig = {
    mode: 'mock'
    /** Latencia simulada de "minado" */
    latencyMs: number
}

export type AppConfig = {
    host: string
    port: number
    logLevel: string
    prettyLogs: boolean
    /** Si se define, todas las rutas de /transactions exigen la cabecera x-api-key */
    apiKey?: string
    /** URL pública del servicio, usada en el campo servers del OpenAPI */
    publicUrl: string
    /** Cadena de conexión de MongoDB */
    mongodbUri: string
    /** Base de datos dentro del servidor MongoDB */
    mongodbDb: string
    /** Crea/actualiza la colección, su validador e índices al arrancar */
    dbSetupOnStart: boolean
    blockchain: RealBlockchainConfig | MockBlockchainConfig
}

function required(env: NodeJS.ProcessEnv, name: string): string {
    const value = env[name]?.trim()
    if (!value) throw new Error(`Falta la variable de entorno ${name}`)
    return value
}

function integer(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
    const raw = env[name]?.trim()
    if (!raw) return fallback
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} debe ser un entero >= 0 (valor: ${raw})`)
    return value
}

function boolean(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
    const raw = env[name]?.trim().toLowerCase()
    if (!raw) return fallback
    return raw === 'true' || raw === '1' || raw === 'yes'
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const port = integer(env, 'PORT', 3000)
    const mode = (env.BLOCKCHAIN_MODE?.trim().toLowerCase() || 'real') as string
    if (mode !== 'real' && mode !== 'mock')
        throw new Error(`BLOCKCHAIN_MODE debe ser "real" o "mock" (valor: ${mode})`)

    const blockchain: AppConfig['blockchain'] =
        mode === 'mock'
            ? { mode: 'mock', latencyMs: integer(env, 'MOCK_LATENCY_MS', 200) }
            : {
                mode: 'real',
                networkName: env.BLOCKCHAIN_NETWORK_NAME?.trim() || 'besu-local',
                rpcUrl: required(env, 'BLOCKCHAIN_RPC_URL'),
                chainId: integer(env, 'BLOCKCHAIN_CHAIN_ID', 11073),
                contractAddress: required(env, 'BLOCKCHAIN_HASH_TIMESTAMP_ADDRESS'),
                privateKey: required(env, 'BLOCKCHAIN_PRIVATE_KEY'),
                confirmationTimeoutMs: integer(env, 'BLOCKCHAIN_CONFIRMATION_TIMEOUT_MS', 30_000),
                rpcTimeoutMs: integer(env, 'BLOCKCHAIN_RPC_TIMEOUT_MS', 10_000),
            }

    return {
        host: env.HOST?.trim() || '0.0.0.0',
        port,
        logLevel: env.LOG_LEVEL?.trim() || 'info',
        prettyLogs: boolean(env, 'LOG_PRETTY', env.NODE_ENV !== 'production'),
        apiKey: env.API_KEY?.trim() || undefined,
        publicUrl: env.PUBLIC_URL?.trim() || `http://localhost:${port}`,
        mongodbUri: required(env, 'MONGODB_URI'),
        mongodbDb: env.MONGODB_DB?.trim() || 'transaction_log',
        dbSetupOnStart: boolean(env, 'DB_SETUP_ON_START', true),
        blockchain,
    }
}
