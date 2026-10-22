import { writeFile } from 'node:fs/promises'
import { buildApp } from '../app.js'
import { MockBlockchainClient } from '../blockchain/mockClient.js'
import type { TransactionRepository } from '../db/transactionRepository.js'

// Genera openapi.json sin base de datos ni blockchain, para compartir la especificación
const unused = new Proxy({} as TransactionRepository, {
    get: () => () => Promise.reject(new Error('No disponible al exportar OpenAPI')),
})
const app = await buildApp({
    repository: unused,
    blockchain: new MockBlockchainClient(),
    blockchainMode: 'real',
    publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3000',
})
await app.ready()
await writeFile('openapi.json', JSON.stringify(app.swagger(), null, 2) + '\n')
await app.close()
console.log('Especificación escrita en openapi.json')
