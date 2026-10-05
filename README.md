# TM Forum Marketplace Template

Plantilla de monorepo para construir un **marketplace sobre las TM Forum Open APIs**, inspirada en [FIWARE Business API Ecosystem (BAE)](https://github.com/FIWARE-TMForum/Business-API-Ecosystem).

La plantilla trae toda la infraestructura conectada (rutas, capas de datos, autenticación OIDC, pagos, email, monitorización, microservicio auxiliar con base de datos), pero **sin lógica de negocio**: los puntos de extensión están marcados en el código con comentarios `// Here you define ...`. La interfaz se renderiza aunque el `.env` esté vacío, así que puedes explorarla antes de conectar ningún servicio.

## Estructura del monorepo

```
.
├── apps/
│   ├── web/            # Frontend Next.js que consume las TM Forum Open APIs
│   └── reviews-api/    # Microservicio auxiliar (comentarios y valoraciones)
├── docker-compose.yml  # web + reviews-api + PostgreSQL
├── package.json        # Scripts raíz (dev:web, dev:api)
└── pnpm-workspace.yaml
```

| App                | Descripción                                                                                   | Documentación                                        |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `apps/web`         | Marketplace: catálogo público, área privada (dashboard) con gestión de entidades TMF y login OIDC | [apps/web/README.md](apps/web/README.md)             |
| `apps/reviews-api` | Servicio de ejemplo con dominio relacional propio: comentarios y valoraciones de `ProductOffering` | [apps/reviews-api/README.md](apps/reviews-api/README.md) |

`apps/web` es el único punto de entrada público: hace de proxy hacia `reviews-api`, que solo es accesible desde la red interna.

## Stack

| Área              | `apps/web`                                           | `apps/reviews-api`                               |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------ |
| Runtime           | Node.js 22.22.2                                      | Node.js 22.22.2 (ESM nativo)                     |
| Framework         | Next.js 16 (App Router, RSC, Server Actions)         | Express 5                                        |
| Lenguaje          | TypeScript 5 (strict)                                | TypeScript 5 (strict)                            |
| Datos             | TanStack React Query v5 + fetch                      | Drizzle ORM + PostgreSQL 16                      |
| UI / formularios  | Tailwind CSS v4, react-hook-form + Zod               | —                                                |
| Autenticación     | OIDC (Authorization Code) + cookie cifrada HTTP-only | Token interno firmado por `apps/web`             |
| Integraciones     | Stripe, nodemailer (SMTP), Sentry                    | OpenAPI 3.0 + Swagger UI                         |
| Testing           | Vitest + Testing Library                             | Vitest, Supertest, Testcontainers                |
| Calidad           | ESLint, Prettier, commitlint, secretlint             | —                                                |

Gestor de paquetes: **pnpm** (workspace).

## Requisitos para funcionar

Sin servicios externos la interfaz se renderiza, pero no muestra datos ni permite iniciar sesión. Para un entorno funcional necesitas:

| Servicio                        | Obligatorio | Uso                                                        |
| ------------------------------- | ----------- | ---------------------------------------------------------- |
| Backend **TM Forum Open APIs**  | Sí          | Catálogos, ofertas, especificaciones, órdenes (TMF620, …)  |
| **Proveedor de identidad OIDC** | Sí          | Login (Authorization Code) y verificación de tokens (JWKS) |
| **PostgreSQL**                  | Sí          | Base de datos de `reviews-api`                             |
| **Stripe**                      | Opcional    | Pagos                                                      |
| **Servidor SMTP**               | Opcional    | Emails transaccionales                                     |
| **Sentry**                      | Opcional    | Errores, trazas y session replay                           |

Herramientas locales: Node.js 22.22.2 (ver `.nvmrc`), pnpm y Docker (PostgreSQL local y tests de integración).

## Puesta en marcha

```bash
# 1. Instalar dependencias (desde la raíz)
pnpm install

# 2. Variables de entorno de cada app
cp apps/web/.env.example apps/web/.env.local
cp apps/reviews-api/.env.example apps/reviews-api/.env
# Rellena los valores de tu entorno (ver el README de cada app)

# 3. Arrancar en desarrollo (en terminales separadas)
pnpm dev:web   # → http://localhost:3000
pnpm dev:api   # → http://localhost:4000 (Swagger UI en /docs)
```

Las migraciones de `reviews-api` y el resto de scripts están descritos en [apps/reviews-api/README.md](apps/reviews-api/README.md).

### Docker Compose

`docker-compose.yml` levanta `web`, `reviews-api` y `reviews-db` (PostgreSQL 16). Lee un `.env` en la raíz, que debe incluir las variables de ambas apps y además `REVIEWS_DB_USER`, `REVIEWS_DB_PASSWORD` y `REVIEWS_DB_NAME`:

```bash
docker compose up --build
```

Solo `web` publica puerto (3000); `reviews-api` queda en la red interna del compose.

## Qué sustituir

La plantilla sigue la convención de FIWARE BAE: el cableado está hecho y la lógica específica de tu negocio se deja como punto de extensión. Cada punto está marcado con un comentario del tipo:

```ts
// Here you define your business logic.
```

Estos comentarios aparecen donde tienes que decidir reglas propias: validaciones, permisos, transformaciones de entidades TMF, flujos de pago, contenido de emails, textos legales, etc. Para localizarlos todos:

```bash
grep -rn "Here you" apps/*/src
```

Recuento de marcadores por área:

| App           | Área                            | Ficheros | Marcadores |
| ------------- | ------------------------------- | -------: | ---------: |
| `web`         | `src/lib` (servicios, datos)    |       40 |        112 |
| `web`         | `src/components`                |       19 |         35 |
| `web`         | `src/app` (rutas y páginas)     |       13 |         21 |
| `web`         | `src/hooks`                     |       10 |         17 |
| `web`         | `src/middleware.ts`             |        1 |          1 |
| `reviews-api` | `src/infrastructure`            |        3 |          5 |
| `reviews-api` | `src/application`               |        4 |          4 |
| `reviews-api` | `src/domain`                    |        1 |          1 |
| **Total**     |                                 |   **91** |    **196** |

Además de los marcadores, revisa:

- Branding: logos, nombre, colores y enlaces de redes sociales (`your-company`).
- Páginas legales (aviso legal, privacidad, cookies) con el texto de tu organización.
- Direcciones de email y dominios de ejemplo (`example.com`, `ejemplo.com`).

## Scripts raíz

| Script         | Descripción                                   |
| -------------- | --------------------------------------------- |
| `pnpm dev:web` | Servidor de desarrollo de `apps/web`          |
| `pnpm dev:api` | Servidor de desarrollo de `apps/reviews-api`  |

Los scripts de build, tests, lint y type-check de cada app se ejecutan con `pnpm --filter <app> <script>`; la lista completa está en el README de cada app.

## Contribuir

Las contribuciones son bienvenidas. Lee la [guía de contribución](CONTRIBUTING.md) y el [Código de Conducta](CODE_OF_CONDUCT.md). Para vulnerabilidades, consulta [SECURITY.md](SECURITY.md).

## Licencia

Copyright (C) 2026 Grayhats.

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`). Si lo ofreces como servicio a través de una red, debes ofrecer el código fuente (modificado) a sus usuarios.
