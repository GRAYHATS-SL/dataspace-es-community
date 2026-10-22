# reviews-api

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org/) [![Express](https://img.shields.io/badge/Express-5-black?logo=express)](https://expressjs.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## Descripción

`reviews-api` es el microservicio de comentarios y valoraciones sobre productos adquiridos del ecosistema DataSpace. Permite a una organización que ha adquirido una `ProductOffering` (con un `ProductInventory` activo, `role: buyer`) publicar una valoración (1-5) y un comentario de texto, y expone la lectura pública de esos comentarios con su media.

No es una API TMForum — es un dominio relacional (agregados, unicidad por comprador+oferta) desacoplado a propósito del backend TMForum/NGSI-LD existente, para evitar heredar sus limitaciones conocidas (arrays reemplazados en PATCH, ausencia de integridad referencial).

### Funcionalidades principales

- **Publicar un comentario** — rating (1-5) + texto opcional (≤1000 caracteres), un comentario por organización y oferta (constraint `UNIQUE`)
- **Listar comentarios** — lectura pública de los comentarios de una oferta junto con su valoración media y conteo
- **Comentarios inmutables** — sin edición ni borrado, sin moderación (decisiones de producto para la v1)
- **Autorización por token interno** — nunca confía en el cliente; solo acepta escrituras firmadas por `apps/web` tras verificar el ownership
- **Documentación OpenAPI** — spec y UI interactiva servidas por el propio servicio

### Qué NO hace (fuera de alcance v1)

- No expone edición ni borrado de comentarios
- No modera contenido ni gestiona reportes de abuso
- No verifica contra TMForum si la oferta referenciada sigue existiendo
- No se expone directamente a Internet — todo el tráfico pasa por el proxy server-side de `apps/web`

## Stack tecnológico

| Área              | Tecnología                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| Runtime           | Node.js 22 (ESM nativo)                                                               |
| Framework HTTP    | [Express 5](https://expressjs.com/)                                                   |
| Lenguaje          | TypeScript 5 (modo strict, alias de rutas, sin clases)                                |
| Base de datos     | PostgreSQL 16                                                                         |
| Acceso a datos    | [Drizzle ORM](https://orm.drizzle.team/) (`pg` driver) + Drizzle Kit para migraciones |
| Arquitectura      | Clean Architecture (`domain` / `application` / `infrastructure`)                      |
| Documentación API | OpenAPI 3.0 + Swagger UI (`swagger-ui-express`)                                       |
| Testing           | Vitest · Testcontainers (Postgres real) · Supertest                                   |
| Calidad de código | TypeScript strict + `tsc-alias`                                                       |

## Requisitos previos

- **Node.js** 24 (ver `engines` en `package.json`)
- **pnpm** — gestor de paquetes del monorepo
- **Docker** — para PostgreSQL en desarrollo y para los tests de integración (Testcontainers)

## Instalación

```bash
# 1. Instalar dependencias desde la raíz del monorepo
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores de tu entorno
```

## Configuración

| Variable       | Descripción                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (`postgres://user:pass@host:5432/db`)                                   |
| `TOKEN_SECRET` | Clave HMAC-SHA256 para verificar el token interno — **compartida con `apps/web`**, mínimo 32 caracteres |
| `PORT`         | Puerto de escucha del servidor (por defecto `4000`)                                                     |

Generar una clave segura:

```bash
openssl rand -hex 32
```

> **Nota:** `TOKEN_SECRET` debe ser exactamente el mismo valor configurado en `apps/web` — si se rota en un despliegue y no en el otro, la verificación de firma falla para todos los tokens.

## Desarrollo

```bash
# Aplicar migraciones contra DATABASE_URL
pnpm migrate

# Iniciar servidor de desarrollo (recarga en caliente)
pnpm dev
# → http://localhost:4000
# → http://localhost:4000/docs (Swagger UI)

# Build de producción
pnpm build

# Servidor de producción
pnpm start
```

En `docker-compose.yml` (raíz del monorepo), `reviews-api` corre como el servicio `reviews-api` junto a `reviews-db` (Postgres) — ninguno de los dos publica puertos al host; solo son alcanzables desde la red interna donde corre `apps/web`.

## Scripts disponibles

| Comando              | Descripción                                            |
| -------------------- | ------------------------------------------------------ |
| `pnpm dev`           | Servidor de desarrollo con recarga en caliente (`tsx`) |
| `pnpm build`         | Compila TypeScript y reescribe los alias (`tsc-alias`) |
| `pnpm start`         | Arranca el build de producción (`dist/index.js`)       |
| `pnpm migrate`       | Aplica las migraciones SQL contra `DATABASE_URL`       |
| `pnpm type-check`    | Verificación de tipos TypeScript sin emitir            |
| `pnpm test`          | Tests en modo watch (Vitest)                           |
| `pnpm test:coverage` | Tests con cobertura de código (lcov)                   |

## Documentación de la API

Con el servidor arrancado:

- **Swagger UI**: `GET /docs` — documentación interactiva, permite probar los endpoints
- **Spec cruda**: `GET /openapi.json` — el mismo contrato en JSON
- Fuente de verdad versionada: [`openapi.yaml`](./openapi.yaml)

### Endpoints

| Método | Ruta                              | Auth                         | Descripción                                                                                  |
| ------ | --------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| `POST` | `/offerings/:offeringId/comments` | Token interno HMAC (TTL 60s) | Crea un comentario. `201` / `400` (rating/body inválido) / `403` (token) / `409` (duplicado) |
| `GET`  | `/offerings/:offeringId/comments` | Ninguna (red interna)        | Devuelve `{ comments, average, count }`                                                      |

## Arquitectura

### Capas (Clean Architecture)

```
domain          ← entidades, tipos, puerto CommentRepository — sin dependencias externas
application     ← casos de uso (createComment, listCommentsByOffering) — solo depende de domain
infrastructure  ← Postgres (Drizzle), Express, verificación del token interno — implementa los puertos de domain
```

Las dependencias solo apuntan hacia adentro: `infrastructure` conoce `application` y `domain`; `domain` no conoce nada de las otras dos capas. Esto permite testear los casos de uso con un `CommentRepository` en memoria, sin levantar Express ni Postgres.

### Alias de imports

Configurados en `tsconfig.json` para evitar rutas relativas con múltiples `../../..`:

| Alias               | Resuelve a             |
| ------------------- | ---------------------- |
| `@domain/*`         | `src/domain/*`         |
| `@application/*`    | `src/application/*`    |
| `@infrastructure/*` | `src/infrastructure/*` |

`tsx` (dev) y Vitest los resuelven de forma nativa vía `tsconfig.json`; el build de producción los reescribe a rutas relativas con `tsc-alias` (Node ESM no entiende alias de `paths` en tiempo de ejecución).

### Autorización: token interno HMAC

`reviews-api` nunca verifica credenciales ni llama a TMForum — confía únicamente en un token interno firmado por `apps/web`:

```
apps/web verifica ProductInventory activo (role: buyer)
  → firma { offeringId, organizationId, individualId, iat } con TOKEN_SECRET (TTL 60s)
  → POST /offerings/:offeringId/comments
      Authorization: Bearer <token>
  → reviews-api verifica firma + TTL + que offeringId del token == offeringId de la ruta
```

Formato del token: `base64url(payloadJson).hex(hmacSha256(payloadJson))`. Ver `src/infrastructure/internalToken.ts`.

### Modelo de datos

```sql
comments (
  id, offering_id, individual_id, organization_id,
  rating SMALLINT CHECK (1-5), body TEXT CHECK (≤1000 chars),
  created_at,
  UNIQUE (organization_id, offering_id)
)
```

## Testing

| Nivel         | Herramienta             | Qué cubre                                                                    |
| ------------- | ----------------------- | ---------------------------------------------------------------------------- |
| Unitario      | Vitest + mocks          | Casos de uso (`domain`/`application`) sin Express ni Postgres real           |
| Integración   | Vitest + Testcontainers | `PgCommentRepository` contra un Postgres real (constraint `UNIQUE`, `CHECK`) |
| Contrato HTTP | Vitest + Supertest      | Controllers Express — firma del token, códigos 201/400/403/409               |

```bash
pnpm test              # todos los niveles
pnpm test:coverage      # con reporte de cobertura
```

Los tests de integración requieren Docker (Testcontainers levanta un Postgres real por ejecución).

## Estructura del proyecto

```
apps/reviews-api/
├── src/
│   ├── domain/                # entidades, Result, puerto CommentRepository
│   ├── application/           # casos de uso
│   ├── infrastructure/
│   │   ├── db/                # esquema Drizzle, cliente, script de migración
│   │   ├── http/               # app Express, controller, OpenAPI/Swagger
│   │   └── internalToken.ts    # verificación del token HMAC
│   └── index.ts                # punto de entrada
├── migrations/                 # migraciones SQL generadas por Drizzle Kit
├── openapi.yaml                 # spec OpenAPI 3.0
├── drizzle.config.ts
├── tsconfig.json                # alias @domain/@application/@infrastructure
├── vitest.config.mts
└── package.json
```
