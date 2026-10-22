import { createHash, randomBytes } from 'node:crypto'

/**
 * Esquema de hash v1. Es el contrato entre este servicio y cualquier verificación
 * futura (auditor, otra herramienta, otro lenguaje):
 *
 *   1. canonical = JCS(json)            RFC 8785: claves ordenadas, sin espacios
 *   2. salt      = 32 bytes aleatorios  CSPRNG, uno nuevo por operación
 *   3. hash      = SHA-256( salt || UTF-8(canonical) )
 *
 * salt y hash se representan como hex en minúsculas con prefijo 0x (66 caracteres).
 * Es la misma especificación que mi-contrato/scripts/hashtimestamp/jsonHash.ts.
 */
export const HASH_SCHEME = 'sha256-jcs-salt32-v1'

const HEX_32_BYTES = /^0x[0-9a-f]{64}$/

/**
 * Serialización canónica JSON (RFC 8785 / JCS). Las claves se ordenan por unidades
 * UTF-16 (el orden por defecto de JavaScript) y números y strings se serializan como
 * en JSON.stringify, que es exactamente lo que define el estándar.
 */
export function canonicalize(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        if (typeof value === 'number' && !Number.isFinite(value))
            throw new Error(`Número no representable en JSON: ${value}`)
        const serialized = JSON.stringify(value)
        if (serialized === undefined) throw new Error(`Valor no representable en JSON: ${String(value)}`)
        return serialized
    }
    if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'

    const object = value as Record<string, unknown>
    const entries = Object.keys(object)
        .sort()
        .filter((key) => object[key] !== undefined)
        .map((key) => JSON.stringify(key) + ':' + canonicalize(object[key]))
    return '{' + entries.join(',') + '}'
}

export function generateSalt(): string {
    return '0x' + randomBytes(32).toString('hex')
}

export function isHex32(value: string): boolean {
    return HEX_32_BYTES.test(value)
}

export function hashJson(json: unknown, salt: string): { canonical: string; hash: string } {
    if (!isHex32(salt)) throw new Error('El salt debe ser 32 bytes en hex: 0x + 64 caracteres en minúsculas')
    const canonical = canonicalize(json)
    const digest = createHash('sha256')
        .update(Buffer.from(salt.slice(2), 'hex'))
        .update(canonical, 'utf8')
        .digest('hex')
    return { canonical, hash: '0x' + digest }
}
