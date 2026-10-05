# Web Template

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

## Descripción

Plantilla de frontend para un marketplace que consume las **TM Forum Open APIs**. Incluye la arquitectura de capas, la infraestructura de datos (fetch + TanStack Query) y el sistema de componentes.

La lógica de negocio no está incluida: los puntos de extensión están marcados en el código con comentarios del tipo `// Here you define your business logic.`

### Funcionalidades de ejemplo

- **Catálogo público** — listado y detalle de ofertas (`ProductOffering`)
- **Área privada** — dashboard con gestión de entidades TM Forum (catálogos, ofertas, especificaciones, órdenes)
- **Autenticación** — login OIDC contra tu proveedor de identidad

## Stack tecnológico

| Área              | Tecnología                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Framework         | [Next.js 16](https://nextjs.org/) — App Router, RSC, Server Actions |
| Lenguaje          | TypeScript 5 (modo strict)                                          |
| Estilos           | Tailwind CSS v4                                                     |
| Gestión de datos  | TanStack React Query v5                                             |
| Formularios       | react-hook-form + Zod                                               |
| Sesión            | Cookie cifrada HTTP-only                                            |
| Autenticación     | OIDC (Authorization Code)                                           |
| Monitorización    | Sentry                                                              |
| Pagos / Email     | Stripe / nodemailer                                                 |
| Testing           | Vitest + Testing Library                                            |
| Calidad de código | ESLint · Prettier · commitlint · secretlint                         |

## Requisitos previos

- **Node.js** 22.22.2 (ver `.nvmrc`)
- **pnpm** — gestor de paquetes del monorepo
- Los servicios externos descritos en [Requisitos para funcionar](#requisitos-para-funcionar)

## Requisitos para funcionar

La plantilla no incluye datos de prueba ni modo demo. **Sin configuración la UI se renderiza, pero las funcionalidades no operan**: el login, las llamadas a la API, los pagos y los emails muestran un aviso o un estado de error. Para que funcione necesitas:

| Servicio                           | Obligatorio | Uso                                                        |
| ---------------------------------- | ----------- | ---------------------------------------------------------- |
| Backend **TM Forum Open APIs**     | Sí          | Catálogo, ofertas, especificaciones, órdenes               |
| **Proveedor de identidad OIDC**    | Sí          | Login (Authorization Code) y verificación de tokens (JWKS) |
| **`reviews-api`** + **PostgreSQL** | Sí          | Comentarios y valoraciones de ofertas                      |
| **Stripe**                         | Opcional    | Pagos                                                      |
| **Servidor SMTP**                  | Opcional    | Emails transaccionales                                     |
| **Sentry**                         | Opcional    | Errores, trazas y session replay                           |

## Instalación

```bash
# 1. Instalar dependencias desde la raíz del monorepo
pnpm install

# 2. Configurar variables de entorno
cp apps/web/.env.example apps/web/.env.local
# Editar .env.local con los valores de tu entorno
```

## Configuración

Todas las variables están documentadas en [`.env.example`](.env.example).

| Variable                          | Descripción                                               |
| --------------------------------- | --------------------------------------------------------- |
| `SESSION_SECRET`                  | Clave de cifrado de sesiones (≥ 32 caracteres)            |
| `TOKEN_SECRET`                    | Clave HMAC para el token interno hacia `reviews-api`      |
| `API_BASE_URL`                    | URL base del backend TM Forum (autenticado)               |
| `CATALOG_PUBLIC_API_BASE_URL`     | URL base del backend TM Forum público (catálogo)          |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | URL pública de la aplicación                              |
| `REVIEWS_API_BASE_URL`            | URL interna de `reviews-api`                              |
| `OIDC_ISSUER_URL`                 | URL del issuer OIDC                                       |
| `OIDC_CLIENT_ID`                  | Client ID de la app en el proveedor de identidad          |
| `OIDC_CLIENT_SECRET`              | Client secret (solo servidor)                             |
| `OIDC_JWKS_URI`                   | Endpoint JWKS para verificar la firma de los tokens       |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Servidor SMTP para emails transaccionales           |
| `SMTP_SENDER`                     | Dirección remitente de los emails                         |
| `STRIPE_SECRET_KEY`               | Clave secreta de Stripe (solo servidor)                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable de Stripe (cliente)                   |
| `NEXT_PUBLIC_SENTRY_DSN`          | DSN del proyecto Sentry                                   |
| `NEXT_PUBLIC_SENTRY_ENABLED` / `SENTRY_ENABLED` | Activa Sentry fuera de producción (cliente / servidor) |
| `NEXT_PUBLIC_SENTRY_RELEASE`      | Identificador de release (SHA o tag)                      |
| `SENTRY_AUTH_TOKEN`               | Token para subir source maps (solo CI)                    |
| `SENTRY_ORG` / `SENTRY_PROJECT`   | Organización y proyecto de Sentry                         |

Generar una clave segura:

```bash
openssl rand -hex 32
```

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

| Comando              | Descripción                                   |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | Servidor de desarrollo                        |
| `pnpm build`         | Build de producción                           |
| `pnpm start`         | Servidor de producción                        |
| `pnpm lint`          | Análisis estático con ESLint                  |
| `pnpm type-check`    | Verificación de tipos TypeScript              |
| `pnpm test`          | Tests unitarios e integración (Vitest)        |
| `pnpm test:coverage` | Tests con cobertura de código (lcov)          |
| `pnpm format`        | Formateo con Prettier                         |
| `pnpm audit`         | Auditoría de vulnerabilidades en dependencias |
| `pnpm gen:sbom`      | Generación de SBOM en formato CycloneDX       |

## Arquitectura

### Grupos de rutas

| Grupo       | Descripción                                                   |
| ----------- | ------------------------------------------------------------- |
| `(public)`  | Páginas públicas: catálogo, login, callback de auth           |
| `(private)` | Área autenticada (`/dashboard/**`) — protegida por middleware |
| `(legal)`   | Páginas estáticas MDX                                         |

### Capas de datos

Cada entidad TM Forum sigue una arquitectura en tres capas:

```
lib/services/queries/<entity>.ts     ← llamadas a la API (Server Actions + apiFetch)
hooks/queries/use<Entity>Queries.ts  ← hooks React Query (factoría createEntityQueries)
lib/validations/<entity>.schema.ts   ← validación con Zod
```

Flujo de una petición:

```
Componente → use<Entity>Queries (TanStack) → Server Action (lib/services) → apiFetch → TM Forum API
```

### Autenticación

Flujo OIDC Authorization Code contra un proveedor de identidad genérico:

```
/login → redirección al IdP (OIDC_ISSUER_URL, OIDC_CLIENT_ID)
  → el usuario se autentica en el IdP
  → IdP redirige a /auth/callback?code=…
  → el servidor intercambia el code por tokens (OIDC_CLIENT_SECRET) y verifica la firma (OIDC_JWKS_URI)
  → se crea la sesión en una cookie cifrada HTTP-only (SESSION_SECRET)
```

El middleware protege `/dashboard/**` comprobando la sesión. El mapeo de claims a roles y permisos es un punto de extensión (`// Here you define your business logic.`).

### Jerarquía de entidades TM Forum (TMF620)

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
│   │   ├── (public)/         # catálogo, auth
│   │   ├── (private)/        # dashboard
│   │   └── (legal)/          # páginas MDX
│   ├── components/
│   │   ├── atoms/
│   │   ├── molecules/
│   │   └── organisms/
│   ├── hooks/queries/        # React Query hooks
│   ├── lib/
│   │   ├── services/queries/ # API TM Forum
│   │   ├── utils/            # helpers
│   │   ├── validations/      # esquemas Zod
│   │   └── session.ts
│   ├── middleware.ts         # protección de rutas
│   └── types/api/            # tipos TM Forum
├── instrumentation.ts        # registro de Sentry (server / edge)
├── instrumentation-client.ts # Sentry en cliente
├── sentry.*.config.ts
├── .env.example
├── next.config.ts
└── package.json
```
