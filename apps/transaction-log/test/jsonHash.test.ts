import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'
import { canonicalize, generateSalt, hashJson, isHex32 } from '../src/hashing/jsonHash.js'

describe('canonicalize (JCS / RFC 8785)', () => {
    it('ordena las claves y elimina espacios', () => {
        assert.equal(canonicalize({ b: 2, a: { d: [1, 'x'], c: null } }), '{"a":{"c":null,"d":[1,"x"]},"b":2}')
    })

    it('serializa números y strings como JSON.stringify (RFC 8785 §3.2.2)', () => {
        assert.equal(canonicalize({ n: 1520.75, e: 1e21, s: 'ñ"\n' }), '{"e":1e+21,"n":1520.75,"s":"ñ\\"\\n"}')
    })

    it('rechaza valores que no son JSON', () => {
        assert.throws(() => canonicalize({ x: Number.NaN }))
        assert.throws(() => canonicalize(() => 1))
    })
})

describe('hashJson', () => {
    it('reproduce el hash registrado en la red local por mi-contrato (vector cruzado)', () => {
        // mi-contrato/samples/operacion-ejemplo.json + su recibo: este hash está sellado en el bloque 8685
        const json = {
            operacionId: 'OP-2026-000123',
            tipo: 'alta',
            importe: 1520.75,
            fecha: '2026-10-14T09:30:00Z',
            estado: 'completada',
        }
        const salt = '0x7c37909ac46248a4dc5c3bbe7c770d842bd559362ccfe833a65a42b61d98cd0e'
        assert.equal(hashJson(json, salt).hash, '0x8f8439f7df402037401645acfcb3a3118674cc2a14990dfb17dba9350df5bd44')
    })

    it('es SHA-256(salt || UTF-8(canonical))', () => {
        const salt = generateSalt()
        const { canonical, hash } = hashJson({ id_buyer: 'B', id_product_offer: 'O', id_product_order: 'P' }, salt)
        const expected = createHash('sha256')
            .update(Buffer.concat([Buffer.from(salt.slice(2), 'hex'), Buffer.from(canonical, 'utf8')]))
            .digest('hex')
        assert.equal(hash, '0x' + expected)
    })

    it('no depende del orden de las claves pero sí de cada valor y del salt', () => {
        const salt = generateSalt()
        const a = hashJson({ id_product_order: 'P', id_product_offer: 'O', id_buyer: 'B' }, salt).hash
        assert.equal(hashJson({ id_buyer: 'B', id_product_offer: 'O', id_product_order: 'P' }, salt).hash, a)
        assert.notEqual(hashJson({ id_product_order: 'P', id_product_offer: 'O', id_buyer: 'B2' }, salt).hash, a)
        assert.notEqual(hashJson({ id_product_order: 'P', id_product_offer: 'O', id_buyer: 'B' }, generateSalt()).hash, a)
    })

    it('genera salts de 32 bytes distintos y valida su formato', () => {
        const salt = generateSalt()
        assert.ok(isHex32(salt))
        assert.notEqual(generateSalt(), salt)
        assert.throws(() => hashJson({}, '0x1234'))
        assert.throws(() => hashJson({}, salt.toUpperCase()))
    })
})
