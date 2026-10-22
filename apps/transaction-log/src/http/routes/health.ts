import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'
import type { BlockchainClient } from '../../blockchain/types.js'
import type { TransactionRepository } from '../../db/transactionRepository.js'

export type HealthRoutesOptions = {
    repository: TransactionRepository
    blockchain: BlockchainClient
    blockchainMode: 'real' | 'mock'
}

export const healthRoutes: FastifyPluginAsyncTypebox<HealthRoutesOptions> = async (app, { repository, blockchain, blockchainMode }) => {
    app.get(
        '/health',
        {
            schema: {
                tags: ['Health'],
                operationId: 'health',
                summary: 'Estado del servicio',
                description: 'Comprueba la conexión con la base de datos y con la blockchain. No requiere x-api-key.',
                response: {
                    200: Type.Ref('HealthResponse', { description: 'Todo funciona.' }),
                    503: Type.Ref('HealthResponse', { description: 'La base de datos o la blockchain no responden.' }),
                },
            },
        },
        async (_request, reply) => {
            const database = await repository
                .ping()
                .then(() => ({ ok: true, detail: 'MongoDB responde' }))
                .catch((error: Error) => ({ ok: false, detail: error.message }))
            const chain = await blockchain.health()
            const ok = database.ok && chain.ok
            return reply.code(ok ? 200 : 503).send({
                status: ok ? 'ok' : 'degraded',
                database,
                blockchain: { ...chain, mode: blockchainMode, network: blockchain.network },
            })
        }
    )
}
