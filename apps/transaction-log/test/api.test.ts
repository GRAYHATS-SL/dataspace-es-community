import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BlockchainError } from '../src/blockchain/types.js'
import { hashJson } from '../src/hashing/jsonHash.js'
import { createTestApp, validInput } from './helpers.js'

async function register(app: Awaited<ReturnType<typeof createTestApp>>['app'], payload: unknown = validInput) {
    return app.inject({ method: 'POST', url: '/transactions', payload: payload as object })
}

describe('POST /transactions', () => {
    it('hashea con salt, sella en blockchain, guarda el registro y responde 201', async () => {
        const { app, repository } = await createTestApp()
        const res = await register(app)
        assert.equal(res.statusCode, 201)
        const body = res.json()

        assert.match(body.hash, /^0x[0-9a-f]{64}$/)
        assert.match(body.salt, /^0x[0-9a-f]{64}$/)
        assert.equal(body.hash, hashJson(validInput, body.salt).hash)
        assert.equal(body.hash_scheme, 'sha256-jcs-salt32-v1')
        assert.deepEqual(
            { id_product_order: body.id_product_order, id_product_offer: body.id_product_offer, id_buyer: body.id_buyer },
            validInput
        )
        assert.equal(body.blockchain.status, 'confirmed')
        assert.equal(body.blockchain.network, 'mock')
        assert.match(body.blockchain.tx_hash, /^0x[0-9a-f]{64}$/)
        assert.ok(Date.parse(body.created_at) && Date.parse(body.blockchain.block_timestamp))

        const stored = repository.rows.get(body.hash)!
        assert.equal(stored.blockchain_status, 'confirmed')
        assert.equal(stored.salt, body.salt)
    })

    it('rechaza con 400 si falta un campo, sobra un campo, está vacío, no es string o tiene espacios en los extremos', async () => {
        const { app, repository } = await createTestApp()
        const invalid = [
            { id_product_order: 'P', id_product_offer: 'O' },
            { ...validInput, extra: 'x' },
            { ...validInput, id_buyer: '' },
            { ...validInput, id_buyer: 42 },
            { ...validInput, id_buyer: ' BUY-1' },
            { ...validInput, id_buyer: 'x'.repeat(256) },
        ]
        for (const payload of invalid) {
            const res = await register(app, payload)
            assert.equal(res.statusCode, 400, JSON.stringify(payload))
            assert.equal(res.json().code, 'VALIDATION_ERROR')
        }
        assert.equal(repository.rows.size, 0)
    })

    it('rechaza JSON mal formado con 400', async () => {
        const { app } = await createTestApp()
        const res = await app.inject({
            method: 'POST',
            url: '/transactions',
            headers: { 'content-type': 'application/json' },
            payload: '{"id_product_order": ',
        })
        assert.equal(res.statusCode, 400)
        assert.equal(res.json().code, 'VALIDATION_ERROR')
    })

    it('devuelve 409 con el registro existente si el pedido ya está registrado', async () => {
        const { app, repository } = await createTestApp()
        const first = (await register(app)).json()
        const res = await register(app, { ...validInput, id_buyer: 'OTRO' })
        assert.equal(res.statusCode, 409)
        assert.equal(res.json().code, 'DUPLICATE_ORDER')
        assert.equal(res.json().record.hash, first.hash)
        assert.equal(repository.rows.size, 1)
    })

    it('si la blockchain falla guarda el registro como failed y responde 502', async () => {
        const { app, blockchain, repository } = await createTestApp()
        blockchain.failure = new BlockchainError('BLOCKCHAIN_UNAVAILABLE', 'red caída')
        const res = await register(app)
        assert.equal(res.statusCode, 502)
        const body = res.json()
        assert.equal(body.code, 'BLOCKCHAIN_UNAVAILABLE')
        assert.equal(body.record.blockchain.status, 'failed')
        assert.match(body.record.blockchain.error, /red caída/)
        assert.equal(repository.rows.get(body.record.hash)!.blockchain_status, 'failed')
    })
})

describe('POST /transactions/:hash/retry', () => {
    it('vuelve a sellar un registro failed con el mismo hash', async () => {
        const { app, blockchain } = await createTestApp()
        blockchain.failure = new BlockchainError('BLOCKCHAIN_UNAVAILABLE', 'red caída')
        const failed = (await register(app)).json().record
        blockchain.failure = null

        const res = await app.inject({ method: 'POST', url: `/transactions/${failed.hash}/retry` })
        assert.equal(res.statusCode, 200)
        assert.equal(res.json().hash, failed.hash)
        assert.equal(res.json().salt, failed.salt)
        assert.equal(res.json().blockchain.status, 'confirmed')
        assert.equal(res.json().blockchain.error, null)
    })

    it('reconcilia sin reenviar si un intento anterior llegó a la cadena (timeout de confirmación)', async () => {
        const { app, blockchain } = await createTestApp()
        blockchain.timeoutAfterStamp = true
        const failed = (await register(app)).json()
        assert.equal(failed.code, 'CONFIRMATION_TIMEOUT')
        // El hash de la transacción se guardó al enviarla, aunque la confirmación no llegara
        assert.match(failed.record.blockchain.tx_hash, /^0x[0-9a-f]{64}$/)
        blockchain.timeoutAfterStamp = false

        const res = await app.inject({ method: 'POST', url: `/transactions/${failed.record.hash}/retry` })
        assert.equal(res.statusCode, 200)
        assert.equal(res.json().blockchain.status, 'confirmed')
    })

    it('es idempotente con registros ya confirmados y da 404 si no existe', async () => {
        const { app } = await createTestApp()
        const created = (await register(app)).json()
        const again = await app.inject({ method: 'POST', url: `/transactions/${created.hash}/retry` })
        assert.equal(again.statusCode, 200)
        assert.equal(again.json().blockchain.tx_hash, created.blockchain.tx_hash)

        const missing = await app.inject({ method: 'POST', url: `/transactions/0x${'0'.repeat(64)}/retry` })
        assert.equal(missing.statusCode, 404)
    })
})

describe('GET /transactions', () => {
    it('consulta por hash (acepta mayúsculas), 404 si no existe y 400 si el hash no es válido', async () => {
        const { app } = await createTestApp()
        const created = (await register(app)).json()
        const res = await app.inject({ method: 'GET', url: `/transactions/0x${created.hash.slice(2).toUpperCase()}` })
        assert.equal(res.statusCode, 200)
        assert.deepEqual(res.json(), created)

        assert.equal((await app.inject({ method: 'GET', url: `/transactions/0x${'a'.repeat(64)}` })).statusCode, 404)
        assert.equal((await app.inject({ method: 'GET', url: '/transactions/no-es-un-hash' })).json().code, 'VALIDATION_ERROR')
    })

    it('lista con filtros y paginación', async () => {
        const { app } = await createTestApp()
        for (const n of [1, 2, 3]) await register(app, { ...validInput, id_product_order: `ORD-${n}`, id_buyer: n === 2 ? 'B2' : 'B1' })

        const all = (await app.inject({ method: 'GET', url: '/transactions?limit=2' })).json()
        assert.equal(all.total, 3)
        assert.equal(all.items.length, 2)
        assert.equal(all.items[0].id_product_order, 'ORD-3')

        const byBuyer = (await app.inject({ method: 'GET', url: '/transactions?id_buyer=B1&status=confirmed' })).json()
        assert.deepEqual(byBuyer.items.map((i: { id_product_order: string }) => i.id_product_order), ['ORD-3', 'ORD-1'])

        assert.equal((await app.inject({ method: 'GET', url: '/transactions?limit=500' })).statusCode, 400)
    })
})

describe('Verificación', () => {
    it('GET /transactions/:hash/verify verifica un registro íntegro', async () => {
        const { app } = await createTestApp()
        const created = (await register(app)).json()
        const res = await app.inject({ method: 'GET', url: `/transactions/${created.hash}/verify` })
        assert.equal(res.statusCode, 200)
        const body = res.json()
        assert.equal(body.verified, true)
        assert.equal(body.hash_matches, true)
        assert.equal(body.on_chain, true)
        assert.equal(body.on_chain_timestamp, created.blockchain.block_timestamp)
    })

    it('detecta que el registro de la base de datos se ha alterado', async () => {
        const { app, repository } = await createTestApp()
        const created = (await register(app)).json()
        repository.rows.get(created.hash)!.id_buyer = 'MANIPULADO'

        const body = (await app.inject({ method: 'GET', url: `/transactions/${created.hash}/verify` })).json()
        assert.equal(body.verified, false)
        assert.equal(body.hash_matches, false)
        assert.equal(body.on_chain, true)
    })

    it('POST /transactions/verify verifica datos + salt aportados y detecta datos alterados', async () => {
        const { app } = await createTestApp()
        const created = (await register(app)).json()

        const ok = (await app.inject({ method: 'POST', url: '/transactions/verify', payload: { ...validInput, salt: created.salt } })).json()
        assert.equal(ok.verified, true)
        assert.equal(ok.hash, created.hash)
        assert.equal(ok.registered_in_log, true)

        const tampered = (
            await app.inject({ method: 'POST', url: '/transactions/verify', payload: { ...validInput, id_buyer: 'X', salt: created.salt } })
        ).json()
        assert.equal(tampered.verified, false)
        assert.equal(tampered.on_chain, false)
        assert.equal(tampered.registered_in_log, false)
        assert.equal(tampered.record, null)
    })
})

describe('Seguridad, salud y documentación', () => {
    it('exige x-api-key en /transactions si está configurada, pero no en /health ni /docs', async () => {
        const { app } = await createTestApp({ apiKey: 'secreto' })
        assert.equal((await register(app)).statusCode, 401)
        assert.equal((await register(app)).json().code, 'UNAUTHORIZED')
        const authorized = await app.inject({ method: 'POST', url: '/transactions', payload: validInput, headers: { 'x-api-key': 'secreto' } })
        assert.equal(authorized.statusCode, 201)
        assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200)
        assert.equal((await app.inject({ method: 'GET', url: '/docs/json' })).statusCode, 200)
    })

    it('GET /health informa de base de datos y blockchain', async () => {
        const { app } = await createTestApp()
        const body = (await app.inject({ method: 'GET', url: '/health' })).json()
        assert.equal(body.status, 'ok')
        assert.equal(body.blockchain.mode, 'mock')
    })

    it('publica la especificación OpenAPI con todos los endpoints y esquemas', async () => {
        const { app } = await createTestApp()
        const spec = (await app.inject({ method: 'GET', url: '/docs/json' })).json()
        assert.equal(spec.openapi, '3.1.0')
        assert.deepEqual(Object.keys(spec.paths).sort(), [
            '/health',
            '/transactions',
            '/transactions/verify',
            '/transactions/{hash}',
            '/transactions/{hash}/retry',
            '/transactions/{hash}/verify',
        ])
        for (const name of ['TransactionResponse', 'BlockchainInfo', 'ErrorResponse', 'VerificationResponse'])
            assert.ok(spec.components.schemas[name], `falta el esquema ${name}`)
        const post = spec.paths['/transactions'].post
        assert.deepEqual(Object.keys(post.responses).sort(), ['201', '400', '401', '409', '500', '502'])
    })

    it('responde 404 con el formato de error común en rutas desconocidas', async () => {
        const { app } = await createTestApp()
        const res = await app.inject({ method: 'GET', url: '/nada' })
        assert.equal(res.statusCode, 404)
        assert.equal(res.json().code, 'NOT_FOUND')
    })
})
