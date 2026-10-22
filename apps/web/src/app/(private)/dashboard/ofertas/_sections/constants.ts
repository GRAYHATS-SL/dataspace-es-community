export const CATALOG_TYPE_OPTIONS = [
  { label: 'Productos', value: 'ProductCatalog' },
  { label: 'Servicios', value: 'ServiceCatalog' },
  { label: 'Recursos', value: 'ResourceCatalog' },
];

// prettier-ignore
export const TABS = [
  { icon: 'Database', label: 'Catálogos', id: 'catalogos', createLabel: 'Nuevo catálogo', description: 'Agrupa tus ofertas en colecciones temáticas para que los compradores encuentren fácilmente lo que buscan.' },
  { icon: 'Layers', label: 'Categorías', id: 'categorias', createLabel: 'Nueva categoría', description: 'Etiquetas que clasifican las ofertas dentro de un catálogo, como las secciones de una tienda.' },
  { icon: 'Tag', label: 'Ofertas', id: 'ofertas', createLabel: 'Nueva oferta', description: 'Los productos o servicios que publicas en el mercado, con su precio, condiciones y descripción.' },
  { icon: 'Box', label: 'Productos', id: 'especificaciones-producto', createLabel: 'Nueva espec. de producto', description: 'La ficha técnica de lo que ofreces: qué es, cómo funciona y qué recursos o servicios lo componen.' },
  { icon: 'Cpu', label: 'Recursos', id: 'especificaciones-recurso', createLabel: 'Nueva espec. de recurso', description: 'Describe los activos de infraestructura o datos concretos que forman parte de tu producto.' },
  { icon: 'Settings', label: 'Servicios', id: 'especificaciones-servicio', createLabel: 'Nueva espec. de servicio', description: 'Define las capacidades o servicios digitales que se ponen a disposición del comprador.' },
  { icon: 'CircleDollarSign', label: 'Precios', id: 'precios', createLabel: 'Nuevo precio', description: 'Gestiona los precios reutilizables que puedes vincular a tus ofertas de producto.' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const PRICE_TYPE_OPTIONS = [
  { label: 'Recurrente', value: 'recurring' },
  { label: 'Único', value: 'one time' },
  { label: 'Por uso', value: 'usage' },
];
