# Changelog

Todas las novedades relevantes del monorepo (`apps/web`, `apps/reviews-api`). Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

Mientras el proyecto no esté en producción se mantiene la serie `0.y.z`; `1.0.0` queda reservado para el paso a producción.

## [0.15.0] - En desarrollo

Adaptación del portal a la infraestructura v2 del marketplace (`marketplacev2.dataspace.es`, TMForum API 1.18.6).

### Añadido

- Credencial del backend (`MarketplaceCredential`) y token con `scope=backend`, cacheados en memoria.
- Paginación completa de listados siguiendo `206 Partial Content`, `X-Total-Count` y `Link`.

### Cambiado

- URLs de verifier, TMF, catálogo público y emisor apuntando a la v2.
- Login con wallet contra el verifier v2: `client_id=tmf-api`, petición sin firmar en el QR y `state` nuevo en cada intento.
- DIDs de organización como `did:web`.
- `PATCH` de listas con la lista final completa y `Content-Type: application/json`.
- Catálogo público limitado a los cinco listados de la v2, solo `GET`.
- Organizaciones de solo lectura, con `status` `validated` o `closed`.

## [0.14.1]

### Seguridad

- Node.js actualizado a 24.22.1 (versión fijada en `.nvmrc` y `engines`) para incorporar las correcciones del boletín de seguridad de octubre de 2026.

## [0.14.0]

### Añadido

- Precio dinámico tokenizado: cálculo de precio variable en función del uso/tokens.
- Informes de testing unitario y de integración.

### Cambiado

- Consolidación: limpieza de código, documentación y archivos de contexto.

## [0.13.0]

### Añadido

- Compra directa desde el catálogo público.
- Comisión del marketplace configurable mediante `MARKETPLACE_FEE_PERCENT`.

### Cambiado

- Checkout con Stripe adaptado de "retener dinero + aprobación/rechazo" a compra directa.
- Catálogo público migrado a la infraestructura v2 del marketplace (listados paginados, endpoints públicos de solo lectura).

## [0.12.0]

### Añadido

- Campos de calidad del dato y visualización recomendada en la ficha del dataset.
- Clasificación automática según la puntuación de calidad.
- Pruebas de acceso con wallets adicionales (Lissi).

## [0.11.0]

### Añadido

- Pagos con Stripe en el checkout, con verificación del pago en servidor.
- Reconciliación de órdenes cuando el navegador interrumpe el retorno del pago.
- Soporte de ofertas gratuitas y pantallas de retorno del pago.

## [0.10.0]

### Añadido

- `reviews-api`: servicio independiente de comentarios y valoraciones (1–5) con PostgreSQL y documentación OpenAPI.
- Comentarios y valoración media en la ficha de oferta.
- Autorización de publicación mediante token interno HMAC de corta duración, solo para compradores con inventario activo.

## [0.9.0]

### Añadido

- Catálogo público con búsqueda por texto, filtros y paginación.
- Despliegue estable y escalado de la infraestructura.

### Cambiado

- Mejoras de UX/UI y accesibilidad de la parte pública.

## [0.8.0]

### Añadido

- Acuerdos (`Agreement`) entre comprador y proveedor tras confirmar la compra.
- Activación del producto adquirido en el inventario del comprador.
- Filtros de órdenes de producto con todos los estados del ciclo de vida.
- Campos de configuración de políticas ODRL en la oferta.

## [0.7.0]

### Añadido

- Pedidos (`ProductOrder`) e inventario (`ProductInventory`) del comprador.
- Sentry para seguimiento de errores y SonarQube para calidad de código.
- Aumento de la cobertura de tests.

## [0.6.0]

### Añadido

- CRUD completo con protección de integridad referencial: aviso y limpieza de referencias antes de borrar.

### Corregido

- Borrar una entidad referenciada (p. ej. una categoría) ya no deja la oferta inaccesible (HTTP 500).

## [0.5.0]

### Añadido

- Integración con las APIs TMForum: catálogos, categorías, ofertas, precios y especificaciones de producto, recurso y servicio.
- Propiedad de datos mediante `relatedParty`, con filtrado por organización cuando el backend no lo ofrece.
- Identificación automática de la organización y la persona (`Individual`) desde el DID.

## [0.4.0]

### Añadido

- Login real con wallet EUDI/DOME: QR generado en servidor, notificación por WebSocket, validación CSRF con `state` de un solo uso, intercambio de código por JWT con verificación RS256 y sesión cifrada (iron-session).
- Protección de rutas privadas y detección de sesión caducada.

## [0.3.0]

### Añadido

- Monorepo (`web`, API y documentación) con configuración compartida.
- Docker Compose, despliegue en EC2 y CI/CD con GitHub Actions.
- Aceptación de términos legales y textos legales.

## [0.2.0]

### Añadido

- Mock navegable del marketplace con datos simulados (localStorage).
- Notificaciones transaccionales por email (SMTP) con plantillas.

## [0.1.0]

### Añadido

- Arquitectura del marketplace: páginas, flujos y sistema de componentes (atomic design).
- Formularios por pasos con React Hook Form y Zod.
- Autenticación simulada y esqueleto del dashboard.

[0.15.0]: #0150---en-curso
[0.14.1]: #0141
[0.14.0]: #0140
[0.13.0]: #0130
[0.12.0]: #0120
[0.11.0]: #0110
[0.10.0]: #0100
[0.9.0]: #090
[0.8.0]: #080
[0.7.0]: #070
[0.6.0]: #060
[0.5.0]: #050
[0.4.0]: #040
[0.3.0]: #030
[0.2.0]: #020
[0.1.0]: #010
