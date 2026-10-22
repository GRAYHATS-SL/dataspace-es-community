# DataSpace Marketplace

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

## Descripción

DataSpace Marketplace es la capa frontend de un Data Space que permite a organizaciones publicar, descubrir y adquirir datasets y servicios de datos. La plataforma está alineada con la especificación **DOME** (Data Marketplace Ecosystem) e integra el flujo completo de autenticación basado en **credenciales verificables** mediante wallet EUDI.

### Funcionalidades principales

- **Catálogo público** — exploración y búsqueda de ofertas de datos disponibles en el marketplace
- **Gestión de publicaciones** — creación y publicación de catálogos, categorías, ofertas, especificaciones y precios siguiendo la jerarquía TMForum
- **Autenticación con wallet** — login mediante OIDC Authorization Code Flow con wallet EUDI/DOME (escaneo QR)
- **Órdenes de producto** — flujo completo de adquisición con seguimiento de estado para comprador y vendedor
- **Gestión de acuerdos** — formalización de acuerdos de acceso a datos (TMForum Agreement API)
- **Inventario** — registro de productos adquiridos y accesos activos
- **Onboarding de organizaciones** — flujo de registro y validación de nuevos proveedores

## Stack tecnológico

| Área              | Tecnología                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Framework         | [Next.js 16](https://nextjs.org/) — App Router, RSC, Server Actions |
| Lenguaje          | TypeScript 5 (modo strict)                                          |
| Estilos           | Tailwind CSS v4                                                     |
| Gestión de datos  | TanStack React Query v5                                             |
| Formularios       | react-hook-form + Zod                                               |
| Sesión            | iron-session (cookie cifrada HTTP-only)                             |
| Monitorización    | Sentry (errores, trazas y session replay)                           |
| Testing           | Vitest + Testing Library                                            |
| Calidad de código | ESLint · Prettier · SonarQube                                       |

## Requisitos previos

- **Node.js** ≥ 20
- **pnpm** — gestor de paquetes del monorepo
- Acceso a una instancia del backend **TMForum Product Catalog API** (NGSI-LD/Scorpio)
- Acceso a una instancia de **VCVerifier** compatible con DOME

## Instalación

```bash
# 1. Instalar dependencias desde la raíz del monorepo
pnpm install

# 2. Configurar variables de entorno
cp apps/web/.env.example apps/web/.env.local
# Editar .env.local con los valores de tu entorno
```

## Configuración

Todas las variables requeridas están documentadas en [`.env.example`](.env.example).

| Variable                          | Descripción                                                 |
| --------------------------------- | ----------------------------------------------------------- |
| `SESSION_SECRET`                  | Clave de cifrado de sesiones (≥ 32 caracteres)              |
| `TOKEN_SECRET`                    | Clave HMAC-SHA256 para tokens internos (≥ 32 caracteres)    |
| `API_BASE_URL`                    | URL base del backend TMForum                                |
| `CATALOG_PUBLIC_API_BASE_URL`     | URL base pública (solo GET) del catálogo, sin token         |
| `REVIEWS_API_BASE_URL`            | URL interna de reviews-api (nunca expuesta al navegador)    |
| `VERIFIER_BASE_URL`               | URL base del VCVerifier OIDC                                |
| `NEXT_PUBLIC_VERIFIER_WS_URL`     | URL WebSocket del VCVerifier (accesible en cliente)         |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | URL pública de la aplicación                                |
| `SMTP_*`                          | Configuración del servidor SMTP para emails transaccionales |
| `NEXT_PUBLIC_SENTRY_DSN`          | DSN del proyecto Sentry                                     |

Generar una clave segura:

```bash
openssl rand -hex 32
```

> **Nota:** `SENTRY_AUTH_TOKEN` solo es necesario en el entorno de CI para subir source maps. No incluir en `.env.local`.

## Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm dev
# → http://localhost:3000

# Build de producción
pnpm build

# Servidor de producción
pnpm start
```

## Scripts disponibles

| Comando              | Descripción                                         |
| -------------------- | --------------------------------------------------- |
| `pnpm dev`           | Servidor de desarrollo                              |
| `pnpm build`         | Build de producción                                 |
| `pnpm start`         | Servidor de producción                              |
| `pnpm lint`          | Análisis estático con ESLint                        |
| `pnpm type-check`    | Verificación de tipos TypeScript                    |
| `pnpm test`          | Tests unitarios e integración (Vitest)              |
| `pnpm test:coverage` | Tests con cobertura de código (lcov para SonarQube) |
| `pnpm format`        | Formateo con Prettier                               |
| `pnpm audit`         | Auditoría de vulnerabilidades en dependencias       |
| `pnpm gen:sbom`      | Generación de SBOM en formato CycloneDX             |

## Arquitectura

### Grupos de rutas

La aplicación usa tres grupos de rutas de Next.js con propósitos distintos:

| Grupo       | Prefijo                                           | Descripción                                      |
| ----------- | ------------------------------------------------- | ------------------------------------------------ |
| `(public)`  | `/inicio-sesion`, `/auth/callback`, `/onboarding` | Flujo de autenticación y registro                |
| `(private)` | `/dashboard/**`                                   | Área autenticada — protegida por middleware Edge |
| `(legal)`   | `/politica-*`, `/cookies`                         | Páginas estáticas MDX                            |

### Capas de datos

Cada entidad TMForum sigue una arquitectura en tres capas:

```
lib/services/queries/<entity>.ts     ← llamadas a la API (Server Actions)
hooks/queries/use<Entity>Queries.ts  ← wrappers React Query
lib/validations/<entity>.schema.ts   ← validación con Zod
```

### Autenticación

Implementa **OIDC Authorization Code Flow** con wallet EUDI/DOME. El usuario escanea un código QR con su wallet, que presenta credenciales verificables. El servidor valida la firma RS256 del JWT resultante y crea una sesión iron-session con TTL alineado al `exp` del token.

### Jerarquía de entidades TMForum

```
ProductCatalog
  └── Category
        └── ProductOffering
              ├── ProductSpecification
              │     ├── ResourceSpecification
              │     └── ServiceSpecification
              └── ProductOfferingPrice
```

## Estructura del proyecto

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (public)/        # auth, onboarding
│   │   ├── (private)/       # dashboard
│   │   └── (legal)/         # páginas MDX
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   ├── hooks/queries/        # React Query hooks
│   ├── lib/
│   │   ├── services/queries/ # API TMForum
│   │   ├── utils/            # helpers
│   │   ├── validations/      # esquemas Zod
│   │   └── session.ts
│   ├── middleware.ts          # protección de rutas (Edge)
│   └── types/api/            # tipos TMForum
├── .env.example
├── next.config.ts
└── package.json
```
