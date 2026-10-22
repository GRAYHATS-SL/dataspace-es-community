import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import { MongoClient, type Db } from 'mongodb'
import { TRANSACTION_COLLECTION, ensureSchema } from '../src/db/mongoSchema.js'
import { MongoTransactionRepository } from '../src/db/transactionRepository.js'
import { DuplicateOrderError, NotFoundError, type NewTransaction } from '../src/domain/transaction.js'

/*
 * Tests de integración contra un MongoDB real (el del docker-compose por defecto, o
 * MONGODB_TEST_URI). Usan una base de datos temporal que se borra al terminar. Si no
 * hay MongoDB disponible, se marcan como omitidos.
 */
const uri = process.env.MONGODB_TEST_URI ?? 'mongodb://transaction_log:transaction_log@localhost:27018/?authSource=admin'

async function connect(): Promise<MongoClient | null> {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1_500 })
    try {
        await client.connect()
        await client.db('admin').command({ ping: 1 })
        return client
    } catch {
        await client.close().catch(() => undefined)
        return null
    }
}

const client = await connect()
const hex32 = () => '0x' + randomBytes(32).toString('hex')

function newTransaction(order: string, overrides: Partial<NewTransaction> = {}): NewTransaction {
    return {
        hash: hex32(),
        salt: hex32(),
        hash_scheme: 'sha256-jcs-salt32-v1',
        id_product_order: order,
        id_product_offer: 'OFF-1',
        id_buyer: 'BUY-1',
        blockchain_network: 'test',
        contract_address: '0x98717d1775AE066A18fad55142A5A85EbfA3E067',
        ...overrides,
    }
}

describe('MongoTransactionRepository (MongoDB real)', { skip: client ? false : `MongoDB no disponible en ${uri}` }, () => {
    let db: Db
    let repository: MongoTransactionRepository

    before(async () => {
        db = client!.db(`transaction_log_test_${randomBytes(4).toString('hex')}`)
        await ensureSchema(db)
        await ensureSchema(db) // idempotente
        repository = new MongoTransactionRepository(db)
    })

    after(async () => {
        await db?.dropDatabase()
        await client?.close()
    })

    it('guarda el documento con el hash como _id, los campos por separado y el estado anidado', async () => {
        const t = newTransaction('ORD-1')
        const record = await repository.insertPending(t)
        assert.equal(record.hash, t.hash)
        assert.equal(record.blockchain_status, 'pending')

        const raw = await db.collection(TRANSACTION_COLLECTION).findOne({ _id: t.hash as never })
        assert.ok(raw)
        assert.equal(raw.id_product_order, 'ORD-1')
        assert.equal(raw.salt, t.salt)
        assert.ok(raw.created_at instanceof Date)
        assert.deepEqual(raw.blockchain, {
            status: 'pending',
            network: 'test',
            contract_address: t.contract_address,
            tx_hash: null,
            block_number: null,
            block_timestamp: null,
            error: null,
        })
        assert.deepEqual(await repository.findByHash(t.hash), record)
        assert.deepEqual(await repository.findByOrder('ORD-1'), record)
    })

    it('recorre el ciclo pending → enviado → failed → confirmed', async () => {
        const t = newTransaction('ORD-2')
        await repository.insertPending(t)
        const txHash = hex32()
        await repository.markSubmitted(t.hash, txHash)
        assert.equal((await repository.findByHash(t.hash))!.tx_hash, txHash)

        const failed = await repository.markFailed(t.hash, 'CONFIRMATION_TIMEOUT: simulado')
        assert.equal(failed.blockchain_status, 'failed')
        assert.equal(failed.tx_hash, txHash)

        const blockTimestamp = new Date('2026-10-19T10:00:02.000Z')
        const confirmed = await repository.markConfirmed(t.hash, {
            txHash,
            blockNumber: 19803,
            blockTimestamp,
            contractAddress: null, // null conserva la dirección guardada
        })
        assert.equal(confirmed.blockchain_status, 'confirmed')
        assert.equal(confirmed.block_number, 19803)
        assert.equal(confirmed.block_timestamp?.toISOString(), blockTimestamp.toISOString())
        assert.equal(confirmed.blockchain_error, null)
        assert.equal(confirmed.contract_address, t.contract_address)
        assert.ok(confirmed.updated_at >= confirmed.created_at)
    })

    it('rechaza un pedido repetido con DuplicateOrderError, también con inserciones simultáneas', async () => {
        await repository.insertPending(newTransaction('ORD-3'))
        await assert.rejects(repository.insertPending(newTransaction('ORD-3')), DuplicateOrderError)

        const results = await Promise.allSettled(Array.from({ length: 5 }, () => repository.insertPending(newTransaction('ORD-4'))))
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
        for (const r of results.filter((r) => r.status === 'rejected'))
            assert.ok((r as PromiseRejectedResult).reason instanceof DuplicateOrderError)
    })

    it('lista con filtros, orden por fecha descendente, paginación y total', async () => {
        const local = new MongoTransactionRepository(db)
        for (const n of [1, 2, 3]) {
            await local.insertPending(newTransaction(`LIST-${n}`, { id_buyer: n === 2 ? 'BUY-LIST-B' : 'BUY-LIST-A' }))
            await new Promise((resolve) => setTimeout(resolve, 5))
        }
        const page = await local.list({ id_buyer: 'BUY-LIST-A', limit: 1, offset: 0 })
        assert.equal(page.total, 2)
        assert.deepEqual(page.items.map((i) => i.id_product_order), ['LIST-3'])
        const second = await local.list({ id_buyer: 'BUY-LIST-A', limit: 1, offset: 1 })
        assert.deepEqual(second.items.map((i) => i.id_product_order), ['LIST-1'])
        assert.equal((await local.list({ blockchain_status: 'confirmed', limit: 100, offset: 0 })).total, 1)
    })

    it('da NotFoundError al actualizar un hash inexistente', async () => {
        await assert.rejects(repository.markFailed(hex32(), 'x'), NotFoundError)
    })

    it('el validador de la colección rechaza documentos incoherentes', async () => {
        const collection = db.collection(TRANSACTION_COLLECTION)
        const valid = {
            _id: hex32(),
            id_product_order: 'VAL-1',
            id_product_offer: 'OFF',
            id_buyer: 'BUY',
            salt: hex32(),
            hash_scheme: 'sha256-jcs-salt32-v1',
            created_at: new Date(),
            updated_at: new Date(),
            blockchain: {
                status: 'pending',
                network: 'test',
                contract_address: null,
                tx_hash: null,
                block_number: null,
                block_timestamp: null,
                error: null,
            },
        }
        const invalid: Record<string, object> = {
            'hash con formato incorrecto': { ...valid, _id: '0x1234' },
            'campo de más': { ...valid, precio: 10 },
            'falta un campo': { ...valid, id_buyer: undefined },
            'estado desconocido': { ...valid, blockchain: { ...valid.blockchain, status: 'ok' } },
            'confirmed sin transacción ni bloque': { ...valid, blockchain: { ...valid.blockchain, status: 'confirmed' } },
        }
        for (const [label, doc] of Object.entries(invalid)) {
            const clean = JSON.parse(JSON.stringify(doc), (key, value) => (key.endsWith('_at') ? new Date(value) : value))
            await assert.rejects(collection.insertOne({ ...clean, _id: (doc as { _id: string })._id }), /Document failed validation/, label)
        }
        await collection.insertOne(valid as never)
    })
})
