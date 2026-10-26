import { MongoClient } from 'mongodb'
import { buildApp } from './app.js'
import { IsbeHashTimestampClient } from './blockchain/isbeClient.js'
import { MockBlockchainClient } from './blockchain/mockClient.js'
import type { BlockchainClient } from './blockchain/types.js'
import { loadConfig } from './config.js'
import { ensureSchema } from './db/mongoSchema.js'
import { MongoTransactionRepository } from './db/transactionRepository.js'

const config = loadConfig()

// Si MongoDB no responde, las operaciones fallan en 5 s en vez de esperar 30 s (valor por defecto del driver)
const mongo = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 5_000, appName: 'transaction-log' })
await mongo.connect()
const db = mongo.db(config.mongodbDb)

const blockchain: BlockchainClient =
    config.blockchain.mode === 'isbe'
        ? new IsbeHashTimestampClient(config.blockchain)
        : new MockBlockchainClient(config.blockchain.latencyMs)

const app = await buildApp({
    repository: new MongoTransactionRepository(db),
    blockchain,
    blockchainMode: config.blockchain.mode,
    apiKey: config.apiKey,
    publicUrl: config.publicUrl,
    logger: {
        level: config.logLevel,
        transport: config.prettyLogs ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } : undefined,
    },
})

if (config.dbSetupOnStart) await ensureSchema(db, (message) => app.log.info(message))
if (config.blockchain.mode === 'mock')
    app.log.warn('BLOCKCHAIN_MODE=mock: blockchain simulada en memoria, sin valor probatorio')

const shutdown = async (signal: string) => {
    app.log.info(`${signal} recibido, cerrando`)
    await app.close()
    await blockchain.close()
    await mongo.close()
    process.exit(0)
}
process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

await app.listen({ host: config.host, port: config.port })
app.log.info(`MongoDB: base de datos ${config.mongodbDb} · Blockchain: ${blockchain.network} · Swagger en ${config.publicUrl}/docs`)
