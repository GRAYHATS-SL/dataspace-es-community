# Guía de contribución

¡Gracias por tu interés en contribuir! Este proyecto se distribuye bajo [AGPL-3.0](LICENSE). Al participar aceptas el [Código de Conducta](CODE_OF_CONDUCT.md).

## Licencia de las contribuciones

Al enviar un pull request aceptas que tu contribución se licencie bajo **AGPL-3.0-only**, la misma licencia del proyecto. Solo envía código que tengas derecho a licenciar así (tu propio trabajo o código con licencia compatible).

Firma tus commits con `git commit -s` ([Developer Certificate of Origin](https://developercertificate.org/)).

## Antes de empezar

- Para bugs y propuestas pequeñas, abre un *issue* o directamente un PR.
- Para cambios grandes (nuevas funcionalidades, cambios de arquitectura), abre antes un *issue* para discutirlo y evitar trabajo perdido.
- Vulnerabilidades: **no** uses issues públicos, sigue [SECURITY.md](SECURITY.md).

## Entorno de desarrollo

Requisitos: Node.js 22.22.2 (ver `.nvmrc`), pnpm y Docker. La puesta en marcha está en el [README](README.md#puesta-en-marcha).

```bash
pnpm install
pnpm dev:web   # http://localhost:3000
pnpm dev:api   # http://localhost:4000
```

## Flujo de trabajo

1. Haz *fork* y crea una rama desde `main` (`feat/...`, `fix/...`, `docs/...`).
2. Haz cambios pequeños y enfocados; un PR, un propósito.
3. Antes de abrir el PR, ejecuta en cada app afectada:

   ```bash
   pnpm --filter web lint
   pnpm --filter web type-check
   pnpm --filter web format:check
   pnpm --filter web test
   pnpm --filter reviews-api test
   pnpm --filter reviews-api build
   ```

4. Añade o actualiza tests y documentación cuando corresponda.
5. Abre el PR describiendo qué cambia y por qué, y enlaza el issue relacionado.

## Convenciones

- **TypeScript en modo estricto**: sin `any` explícito ni `// @ts-ignore`; tipos explícitos en las fronteras públicas.
- **Formato y lint**: Prettier y ESLint (hay hooks de Husky y lint-staged en `apps/web`).
- **Secretos**: nunca incluyas credenciales, tokens ni ficheros `.env` (el repo usa secretlint).
- Sigue los patrones existentes del código antes de introducir otros nuevos.

### Mensajes de commit

[Conventional Commits](https://www.conventionalcommits.org/) validados con commitlint. El *scope* es opcional pero, si se usa, debe ser uno de:
`auth`, `session`, `catalog`, `offering`, `api`, `hooks`, `ui`, `middleware`, `config`, `deps`, `ci`, `docs`, `tests`.

```
feat(catalog): añadir filtro por categoría
fix(auth): renovar sesión al expirar el token
```

El asunto va en minúsculas (no `Sentence case` ni mayúsculas).

## Cabeceras de licencia

Los ficheros nuevos de código deben incluir al inicio:

```ts
// SPDX-License-Identifier: AGPL-3.0-only
```
