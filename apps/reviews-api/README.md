# reviews-api

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/) [![Express](https://img.shields.io/badge/Express-5-black?logo=express)](https://expressjs.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## Descripción

`reviews-api` es un microservicio auxiliar de ejemplo que complementa el backend TM Forum con un dominio relacional propio: comentarios y valoraciones sobre una `ProductOffering`.

Sirve como plantilla para cualquier servicio auxiliar que necesites junto a las TM Forum Open APIs. Las reglas de negocio no están incluidas: los puntos de extensión están marcados con comentarios del tipo `// Here you define your business logic.`

### Funcionalidades de ejemplo

- **CRUD de comentarios** — crear, listar, consultar, actualizar parcialmente y borrar comentarios (rating 1-5 + texto opcional) de una oferta
- **Autorización por token interno** — solo acepta escrituras firmadas por `apps/web`
- **Documentación OpenAPI** — spec y UI interactiva servidas por el propio servicio

## Stack tecnológico

| Área              | Tecnología                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| Runtime           | Node.js 22 (ESM nativo)                                                               |
| Framework HTTP    | [Express 5](https://expressjs.com/)                                                   |
| Lenguaje          | TypeScript 5 (modo strict, alias de rutas)                                            |
| Base de datos     | PostgreSQL 16                                                                         |
| Acceso a datos    | [Drizzle ORM](https://orm.drizzle.team/) (`pg` driver) + Drizzle Kit para migraciones |
| Arquitectura      | Clean Architecture (`domain` / `application` / `infrastructure`)                      |
| Documentación API | OpenAPI 3.0 + Swagger UI (`swagger-ui-express`)                                       |
| Testing           | Vitest · Testcontainers (Postgres real) · Supertest                                   |

## Requisitos previos

- **Node.js** 22.22.2 (ver `engines` en `package.json`)
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

| Variable       | Descripción                                                                           |
| -------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (`postgres://user:pass@host:5432/db`)                 |
| `TOKEN_SECRET` | Clave HMAC para verificar el token interno — **compartida con `apps/web`**            |
| `PORT`         | Puerto de escucha del servidor (por defecto `4000`)                                   |

Generar una clave segura:

```bash
openssl rand -hex 32
```

> **Nota:** `TOKEN_SECRET` debe tener el mismo valor en `apps/web` y en `reviews-api`.

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

En `docker-compose.yml` (raíz del monorepo), `reviews-api` corre junto a `reviews-db` (Postgres). Ninguno publica puertos al host; solo son alcanzables desde la red interna donde corre `apps/web`.

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

- **Swagger UI**: `GET /docs`
- **Spec cruda**: `GET /openapi.json`
- Fuente de verdad versionada: [`openapi.yaml`](./openapi.yaml)

### Endpoints

| Método   | Ruta                                         | Auth          | Descripción                                                                      |
| -------- | -------------------------------------------- | ------------- | -------------------------------------------------------------------------------- |
| `GET`    | `/offerings/:offeringId/comments`            | Ninguna       | Devuelve la lista de comentarios de la oferta (`Comment[]`)                      |
| `POST`   | `/offerings/:offeringId/comments`            | Token interno | Crea un comentario. `201` / `400` (payload) / `403` (token)                      |
| `GET`    | `/offerings/:offeringId/comments/:commentId` | Ninguna       | Devuelve un comentario. `200` / `404`                                            |
| `PATCH`  | `/offerings/:offeringId/comments/:commentId` | Token interno | Actualiza `rating` y/o `body`. `200` / `400` (payload) / `403` (token) / `404`   |
| `DELETE` | `/offerings/:offeringId/comments/:commentId` | Token interno | Borra un comentario. `204` / `403` (token) / `404`                               |

`Comment = { id (uuid), offeringId, rating (1-5), body (≤ 1000, nullable), createdAt, updatedAt }`

## Arquitectura

### Capas (Clean Architecture)

```
domain          ← entidades, tipos, puerto CommentRepository — sin dependencias externas
application     ← casos de uso — solo depende de domain
infrastructure  ← Postgres (Drizzle), Express, verificación del token interno — implementa los puertos de domain
```

Las dependencias solo apuntan hacia adentro: `infrastructure` conoce `application` y `domain`; `domain` no conoce nada de las otras dos capas. Esto permite testear los casos de uso con un repositorio en memoria, sin levantar Express ni Postgres.

### Alias de imports

| Alias               | Resuelve a             |
| ------------------- | ---------------------- |
| `@domain/*`         | `src/domain/*`         |
| `@application/*`    | `src/application/*`    |
| `@infrastructure/*` | `src/infrastructure/*` |

`tsx` (dev) y Vitest los resuelven vía `tsconfig.json`; el build de producción los reescribe a rutas relativas con `tsc-alias` (Node ESM no entiende alias de `paths` en tiempo de ejecución).

### Autorización: token interno

`reviews-api` no gestiona credenciales de usuario: confía en un token de vida corta firmado por `apps/web` con `TOKEN_SECRET`.

```
apps/web aplica sus reglas de autorización   ← Here you define your authorization rules.
  → firma el token con TOKEN_SECRET
  → POST / PATCH / DELETE /offerings/:offeringId/comments[/:commentId]  (Authorization: Bearer <token>)
  → reviews-api verifica firma HMAC-SHA256 y caducidad (TTL 60 s)
```

Formato del token: `base64url(payloadJson).hex(hmacSha256(payloadB64))`, con payload `{ sub?, iat, offeringId? }` (`iat` en epoch ms). Si el token incluye `offeringId`, debe coincidir con el de la ruta.

### Modelo de datos

```sql
comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id TEXT NOT NULL,                              -- índice idx_comments_offering_id
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT CHECK (char_length(body) <= 1000),     -- nullable
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Here you define your own columns and constraints.
)
```

## Testing

| Nivel         | Herramienta             | Qué cubre                                         |
| ------------- | ----------------------- | ------------------------------------------------- |
| Unitario      | Vitest + repo en memoria | Casos de uso sin Express ni Postgres real         |
| Integración   | Vitest + Testcontainers | Repositorio Postgres contra una base de datos real |
| Contrato HTTP | Vitest + Supertest      | Controllers Express y códigos de respuesta        |

```bash
pnpm test               # todos los niveles
pnpm test:coverage      # con reporte de cobertura
```

Los tests de integración requieren Docker.

## Estructura del proyecto

```
apps/reviews-api/
├── src/
│   ├── domain/                # entidades, Result, puerto CommentRepository
│   ├── application/           # casos de uso
│   ├── infrastructure/
│   │   ├── db/                # esquema Drizzle, cliente, script de migración
│   │   ├── http/              # app Express, controller, OpenAPI/Swagger
│   │   └── internalToken.ts   # verificación del token interno
│   └── index.ts               # punto de entrada
├── migrations/                # migraciones SQL generadas por Drizzle Kit
├── openapi.yaml               # spec OpenAPI 3.0
├── drizzle.config.ts
├── tsconfig.json
├── vitest.config.mts
└── package.json
```
