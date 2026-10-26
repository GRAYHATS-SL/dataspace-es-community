# transaction-log

Servicio que registra operaciones de pedido con **sello de tiempo en la blockchain ISBE**.

Recibe un JSON con `id_product_order`, `id_product_offer` e `id_buyer`, lo convierte en un hash con *salt*,
registra ese hash en el contrato **HashTimestamp** de ISBE (que certifica que la operación existía en esa
fecha) y guarda el registro completo en MongoDB usando el hash como identificador (`_id`).

```
 cliente ──POST /transactions──► transaction-log ──timestampHash(hash)──► ISBE (proxy HashTimestamp)
                                      │                                         │
                                      │ hash + campos + salt + fechas           │ hash → fecha del bloque
                                      ▼                                         ▼
                                   MongoDB                               blockchain (inmutable)
```

Documentación completa de la API (Swagger): **http://localhost:3000/docs** · especificación en [`openapi.json`](openapi.json).

## Arranque rápido

Requisitos: Node.js ≥ 20.19, Docker y la red ISBE local de `../mi-contrato` en marcha con el proxy
HashTimestamp desplegado (`mi-contrato/scripts/hashtimestamp/deployHashTimestamp.ts`).

```bash
npm install
cp .env.example .env          # revisar ISBE_HASH_TIMESTAMP_ADDRESS
docker compose up -d mongo    # MongoDB 8.0 en localhost:27018
npm run dev                   # crea la colección e índices y arranca en http://localhost:3000
```

Sin red ISBE: `BLOCKCHAIN_MODE=mock` en `.env` (blockchain simulada en memoria, sin valor probatorio).

Todo en Docker (servicio + MongoDB): `docker compose --profile app up -d --build`.

## Endpoints

| Método | Ruta | Para qué |
|---|---|---|
| `POST` | `/transactions` | Registrar una operación: hash + sello en blockchain + registro en BD. **201** / 400 / 409 / 502 |
| `GET` | `/transactions` | Buscar registros (filtros por pedido, oferta, comprador, estado; paginado) |
| `GET` | `/transactions/{hash}` | Consultar un registro |
| `POST` | `/transactions/{hash}/retry` | Reintentar el sellado de un registro `failed`/`pending` |
| `GET` | `/transactions/{hash}/verify` | Verificar un registro del log contra la blockchain (detecta manipulaciones en la BD) |
| `POST` | `/transactions/verify` | Verificar datos aportados por un tercero (campos + salt), sin fiarse del log |
| `GET` | `/health` | Estado de base de datos y blockchain |

```bash
curl -X POST http://localhost:3000/transactions \
  -H 'Content-Type: application/json' \
  -d '{"id_product_order":"ORD-2026-000124","id_product_offer":"OFF-7781","id_buyer":"BUY-00042"}'
```

## Cómo se calcula el hash (`sha256-jcs-salt32-v1`)

```
canonical = JCS(json)              RFC 8785: claves ordenadas, sin espacios
salt      = 32 bytes aleatorios    uno nuevo por operación
hash      = SHA-256( salt || UTF-8(canonical) )
```

Implementación: [`src/hashing/jsonHash.ts`](src/hashing/jsonHash.ts). Es la misma especificación que
`mi-contrato/scripts/hashtimestamp/jsonHash.ts`; el test `test/jsonHash.test.ts` comprueba que ambas producen
el hash que ya está registrado en la red local (vector cruzado). Para verificar una operación en el futuro,
con cualquier lenguaje, hacen falta los tres campos y el salt: por eso el salt se guarda en la BD.

## Base de datos

MongoDB, base de datos `transaction_log`, colección `transaction_log`: **un documento por operación**.

```js
{
  _id: '0x5a505bb4…',                 // hash: identificador de la operación y valor registrado en la blockchain
  id_product_order: 'ORD-MONGO-0001',  // campos del JSON, cada uno por separado (id_product_order es único)
  id_product_offer: 'OFF-500',
  id_buyer: 'BUY-777',
  salt: '0x85f66eda…',                 // lo necesario para recalcular el hash
  hash_scheme: 'sha256-jcs-salt32-v1',
  created_at: ISODate('2026-10-19T08:16:12.199Z'),   // cuándo recibió el servicio la operación
  updated_at: ISODate('2026-10-19T08:16:14.220Z'),
  blockchain: {
    status: 'confirmed',               // pending → confirmed / failed
    network: 'isbe-local (chainId 11073)',
    contract_address: '0x98717d17…',
    tx_hash: '0x0a87283f…',
    block_number: 30523,
    block_timestamp: ISODate('2026-10-19T08:16:15Z'),  // fecha certificada por la blockchain
    error: null                        // último error si status = failed
  }
}
```

MongoDB no tiene esquema fijo, así que el servicio lo impone al arrancar
([`src/db/mongoSchema.ts`](src/db/mongoSchema.ts), también con `npm run db:setup`):

- **Validador `$jsonSchema`** (`validationLevel: strict`): rechaza documentos con campos de más o de menos,
  hash/salt con formato incorrecto, estados desconocidos o un `confirmed` sin transacción ni bloque. Cada
  campo lleva su descripción: `db.getCollectionInfos({name: 'transaction_log'})`.
- **Índices**: `id_product_order` único (impide duplicados aunque lleguen dos peticiones a la vez),
  `id_product_offer`, `id_buyer`, `created_at` descendente y `blockchain.status`.

Es idempotente: si cambia el validador o se añade un índice, se aplica en el siguiente arranque.

## Configuración

Todas las variables están documentadas en [`.env.example`](.env.example). Las principales:

| Variable | Por defecto | |
|---|---|---|
| `MONGODB_URI`, `MONGODB_DB` | —, `transaction_log` | Conexión MongoDB y base de datos |
| `DB_SETUP_ON_START` | `true` | Crear/actualizar colección, validador e índices al arrancar |
| `BLOCKCHAIN_MODE` | `isbe` | `isbe` o `mock` |
| `ISBE_RPC_URL`, `ISBE_CHAIN_ID` | —, `11073` | Nodo ISBE |
| `ISBE_HASH_TIMESTAMP_ADDRESS` | — | Proxy HashTimestamp |
| `ISBE_PRIVATE_KEY` | — | Cuenta con `HASH_TIMESTAMP_ROLE` (local: Account #0 de Hardhat, pública) |
| `ISBE_CONFIRMATION_TIMEOUT_MS` | `30000` | Espera máxima de confirmación por petición |
| `API_KEY` | (vacío) | Si se define, `/transactions` exige la cabecera `x-api-key` |

## Comportamiento ante fallos

- **El registro se guarda antes de tocar la blockchain** (`pending`). Si la blockchain falla, queda `failed`
  con el error, la respuesta es 502 y se reintenta con `POST /transactions/{hash}/retry` (mismo hash y salt).
- **El `tx_hash` se guarda en cuanto se envía la transacción.** Si la confirmación no llega a tiempo
  (`CONFIRMATION_TIMEOUT`), el *retry* comprueba primero esa transacción y, si ya entró en un bloque, solo
  actualiza el registro: nunca se registra dos veces.
- Si el hash está en la cadena pero no se conoce la transacción, se localiza su bloque por búsqueda binaria
  sobre las fechas de bloque (los nodos limitan `eth_getLogs` a rangos de 5000 bloques).
- **Duplicados**: un `id_product_order` solo se registra una vez (409 con el registro existente), también
  ante peticiones simultáneas (restricción `UNIQUE` en la BD).
- **Concurrencia**: las transacciones se envían en serie con un contador de nonces propio, y se confirman
  en paralelo. Probado con 10 peticiones simultáneas: todas en el mismo bloque.
- **Comisiones**: se usa `eth_gasPrice` del nodo como propina; con la propina 0 que propone ethers por
  defecto, Besu tardaba ~4 bloques (7-8 s) en incluir la transacción, frente a ~1-2 s ahora.

## Paso a la red ISBE real

Solo cambia la configuración, no el código:

1. `ISBE_RPC_URL`, `ISBE_CHAIN_ID` e `ISBE_NETWORK_NAME` de la red que os asigne ISBE.
2. `ISBE_HASH_TIMESTAMP_ADDRESS`: el proxy HashTimestamp que os den (o despleguéis) con vuestra cuenta en `rbacs`.
3. **Firma con KMS en lugar de `ISBE_PRIVATE_KEY`**: pendiente de implementar un `Signer` KMS en
   `src/blockchain/isbeClient.ts` (hoy se usa `Wallet`); confirmar con ISBE el mecanismo exigido.
4. `API_KEY` (o la autenticación que corresponda) y `PUBLIC_URL`.

## Desarrollo

```bash
npm test                 # 30 tests: hash (incluye vector cruzado con mi-contrato), API y repositorio MongoDB
npm run typecheck
npm run build && npm start
npm run db:setup         # crea/actualiza colección, validador e índices sin arrancar el servicio
npm run openapi:export   # regenera openapi.json
```

Los tests de API usan un repositorio en memoria y una blockchain simulada controlable (fallos, timeouts),
así que no necesitan base de datos ni red ISBE. Los del repositorio (`test/mongoRepository.test.ts`) se
ejecutan contra el MongoDB del docker-compose (o `MONGODB_TEST_URI`) en una base de datos temporal que se
borra al terminar; si no hay MongoDB disponible se omiten.

```
src/
  server.ts                 arranque: configuración, MongoDB, blockchain, HTTP
  app.ts                    Fastify + Swagger + manejo de errores
  config.ts                 variables de entorno
  hashing/jsonHash.ts       JCS + salt + SHA-256
  services/                 flujo de registro, reintento y verificación
  blockchain/               cliente ISBE (ethers) y simulador; ABI de HashTimestamp
  db/                       repositorio MongoDB, validador $jsonSchema e índices
  http/                     rutas, esquemas (validación + OpenAPI) y textos del Swagger
test/                       node:test
```

## Limitaciones conocidas

- **Una cuenta por instancia**: el contador de nonces vive en memoria. Varias instancias con la misma cuenta
  colisionarían; usar una cuenta por instancia o una cola única de envío.
- Si una transacción enviada se pierde del *mempool* sin minarse, los envíos posteriores quedarían
  esperando ese nonce. Poco probable en ISBE; se resuelve reiniciando el servicio.
- El modo `mock` no persiste: tras reiniciar, la verificación de registros `mock` da `on_chain: false`.
- Sin autenticación por defecto (solo `API_KEY` opcional).
