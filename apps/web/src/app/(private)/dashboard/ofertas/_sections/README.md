# `_sections/`

Componentes y lógica co-localizados con la ruta `/dashboard/ofertas`. Cada archivo tiene una única responsabilidad; `page.client.tsx` los compone.

## Datos y constantes

- **`constants.ts`** — `TABS`, `TabId`, `CATALOG_TYPE_OPTIONS`, `PRICE_TYPE_OPTIONS`. Fuente única de verdad para la configuración de las pestañas y los selects de tipo.
- **`useOfertasData.ts`** — Hook que agrega las 7 queries de entidades TMForum y los 6 mapas de referencias cruzadas (`useMemo`) necesarios para proteger los deletes.

## Drawer

- **`OfertasDrawer.tsx`** — Panel lateral deslizante adaptado al header sticky de la app (z-30, spacer de 144 px). Gestiona foco, cierre con Escape y backdrop.

## Formularios (crear / editar)

- **`CatalogForm.tsx`** — Crea o edita un `Catalog`, incluyendo la asignación de categorías via `setCatalogCategories`.
- **`CategoryForm.tsx`** — Crea o edita una `Category` con soporte de categoría padre.
- **`OfferingForm.tsx`** — Crea o edita un `ProductOffering`. Incluye el sub-componente `PriceManagementSection` para vincular precios en el flujo post-creación.
- **`PriceForm.tsx`** — Crea o edita un `ProductOfferingPrice` con campos condicionales por tipo (recurrente, único, por uso).
- **`ProductSpecForm.tsx`** — Crea o edita una `ProductSpecification` con características, recursos y servicios vinculados.
- **`ResourceSpecForm.tsx`** — Crea o edita una `ResourceSpecification` con array de características.
- **`ServiceSpecForm.tsx`** — Crea o edita una `ServiceSpecification` con array de características.

## Listas (tabla + estados de carga/vacío)

- **`CatalogList.tsx`** — Tabla de catálogos; delega el render de cada fila a `CatalogTableRow`.
- **`CategoryList.tsx`** — Tabla de categorías; pasa los ref maps de catálogos y ofertas a `CategoryTableRow` para los checks pre-delete.
- **`OfferingList.tsx`** — Tabla de ofertas; delega a `OfferingTableRow`.
- **`PriceList.tsx`** — Tabla de precios; pasa el ref map de ofertas a `PriceTableRow` para el flujo de limpieza de referencias antes de borrar.
- **`ProductSpecList.tsx`** — Tabla de especificaciones de producto; pasa el ref map de ofertas a `ProductSpecTableRow`.
- **`ResourceSpecList.tsx`** — Tabla de especificaciones de recurso; pasa el ref map de product specs a `ResourceSpecTableRow`.
- **`ServiceSpecList.tsx`** — Tabla de especificaciones de servicio; pasa el ref map de product specs a `ServiceSpecTableRow`.
