export const API_DESCRIPTION = `
Servicio de **registro de operaciones de pedido con sello de tiempo en la blockchain**.

Cada operación recibida (pedido + oferta + comprador) se convierte en un hash con *salt*; ese hash se
registra en el contrato **HashTimestamp**, que certifica que la operación existía en esa fecha,
y el registro completo se guarda en MongoDB usando el hash como identificador (\`_id\`).

## Flujo de \`POST /transactions\`

1. Se valida el JSON: exactamente \`id_product_order\`, \`id_product_offer\` e \`id_buyer\`.
2. Si el \`id_product_order\` ya está registrado → **409** con el registro existente.
3. Se genera un *salt* aleatorio de 32 bytes y se calcula el hash (ver abajo).
4. Se guarda el registro en la base de datos con estado \`pending\`.
5. Se registra el hash en la blockchain y **se espera a que quede confirmado en un bloque**
6. Se actualiza el registro a \`confirmed\` con la transacción, el bloque y su fecha → **201**.

Si la blockchain falla en el paso 5, el registro **no se pierde**: queda en estado \`failed\` con el error
y la respuesta es **502**. Se puede reintentar con \`POST /transactions/{hash}/retry\` (mismo hash y salt).

## Cómo se calcula el hash (\`hash_scheme = sha256-jcs-salt32-v1\`)

\`\`\`
canonical = JCS(json)              RFC 8785: claves ordenadas, sin espacios
salt      = 32 bytes aleatorios    uno nuevo por operación
hash      = SHA-256( salt || UTF-8(canonical) )
\`\`\`

Ejemplo de \`canonical\` para la operación de ejemplo:
\`{"id_buyer":"BUY-777","id_product_offer":"OFF-500","id_product_order":"ORD-DEMO-0001"}\`

Cualquiera que tenga los tres campos y el salt puede recalcular el hash con cualquier lenguaje y
comprobarlo en la blockchain: por eso el salt se guarda y se devuelve. El *salt* evita que, viendo solo
el hash público en la blockchain, alguien pueda adivinar los identificadores probando combinaciones.

## Estados del sellado (\`blockchain.status\`)

| Estado | Significado |
|---|---|
| \`pending\` | Guardado; la transacción se está enviando o esperando confirmación |
| \`confirmed\` | Sellado en un bloque. \`block_timestamp\` es la fecha certificada |
| \`failed\` | La blockchain falló. Ver \`blockchain.error\`. Reintentable |

## Verificación

- \`GET /transactions/{hash}/verify\` comprueba un registro del log: recalcula el hash con sus datos y salt
  (detecta si la base de datos se ha alterado) y lo busca en la blockchain.
- \`POST /transactions/verify\` comprueba datos aportados por un tercero (campos + salt) sin fiarse del log.

## Modos de blockchain

- **\`real\`**: registra en la red
- **\`mock\`**: blockchain simulada en memoria para desarrollo. Se pierde al reiniciar y **no tiene valor
  probatorio**; los registros indican \`network: "mock"\`.

## Errores

Todas las respuestas de error tienen el formato \`ErrorResponse\` con un \`code\` estable:

| HTTP | code | Cuándo |
|---|---|---|
| 400 | \`VALIDATION_ERROR\` | JSON inválido, campos que faltan o sobran, valores vacíos |
| 401 | \`UNAUTHORIZED\` | Falta o es incorrecta la cabecera \`x-api-key\` (solo si el servicio tiene \`API_KEY\`) |
| 404 | \`NOT_FOUND\` | No existe un registro con ese hash |
| 409 | \`DUPLICATE_ORDER\` | El \`id_product_order\` ya está registrado |
| 502 | \`BLOCKCHAIN_UNAVAILABLE\` | No se puede contactar con la red |
| 502 | \`CONFIRMATION_TIMEOUT\` | La transacción no se confirmó a tiempo (puede confirmarse después: usar *retry*) |
| 502 | \`MISSING_ROLE\` | La cuenta del servicio no tiene \`HASH_TIMESTAMP_ROLE\` en el contrato |
| 502 | \`CONTRACT_PAUSED\` | El contrato HashTimestamp está pausado |
| 502 | \`TRANSACTION_REVERTED\` | La blockchain rechazó la transacción por otro motivo |
| 500 | \`INTERNAL_ERROR\` | Error inesperado (ver logs del servicio) |
`.trim()
