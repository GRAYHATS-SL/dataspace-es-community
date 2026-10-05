/** Tabs of the "my products" page. */
export const TABS = [
  { id: 'buyer', label: 'Como consumidor', icon: 'ShoppingCart' },
  { id: 'seller', label: 'Como proveedor', icon: 'Package' },
];

/** Role of the current user in a product. */
export type ProductRole = 'buyer' | 'seller';

/** Colors and label of a status pill. */
export interface PillConfig {
  bgColor: string;
  textColor: string;
  dotColor: string;
  label: string;
}

/** Status pill per product status. */
export const STATUS_PILL_CONFIG: Record<string, PillConfig> = {
  active: { bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500', label: 'Activo' },
  created: { bgColor: 'bg-neutral-100', textColor: 'text-neutral-700', dotColor: 'bg-neutral-400', label: 'Creado' },
  pendingActive: { bgColor: 'bg-amber-50', textColor: 'text-amber-700', dotColor: 'bg-amber-400', label: 'Activando' },
  suspended: { bgColor: 'bg-orange-50', textColor: 'text-orange-700', dotColor: 'bg-orange-400', label: 'Suspendido' },
  pendingTerminate: { bgColor: 'bg-amber-50', textColor: 'text-amber-700', dotColor: 'bg-amber-400', label: 'Terminando' },
  terminated: { bgColor: 'bg-gray-50', textColor: 'text-gray-600', dotColor: 'bg-gray-400', label: 'Terminado' },
  cancelled: { bgColor: 'bg-red-50', textColor: 'text-red-700', dotColor: 'bg-red-400', label: 'Cancelado' },
  aborted: { bgColor: 'bg-red-100', textColor: 'text-red-800', dotColor: 'bg-red-600', label: 'Abortado' },
};

/** Fallback pill for unknown statuses. */
export const DEFAULT_PILL_CONFIG: PillConfig = {
  bgColor: 'bg-gray-50',
  textColor: 'text-gray-500',
  dotColor: 'bg-gray-300',
  label: '—',
};

/** Columns of the buyer table. */
export const BUYER_COLUMNS = [
  { key: 'product', label: 'Producto', align: 'left' as const },
  { key: 'provider', label: 'Proveedor', align: 'left' as const },
  { key: 'start', label: 'Inicio', align: 'center' as const },
  { key: 'expiry', label: 'Expiración', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'consumption', label: 'Consumo', align: 'center' as const },
  { key: 'agreement', label: 'Acuerdo', align: 'center' as const },
  { key: 'detail', label: '', align: 'right' as const },
];

/** Columns of the seller table. */
export const SELLER_COLUMNS = [
  { key: 'product', label: 'Producto', align: 'left' as const },
  { key: 'buyer', label: 'Comprador', align: 'left' as const },
  { key: 'start', label: 'Inicio', align: 'center' as const },
  { key: 'expiry', label: 'Expiración', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'actions', label: 'Acciones', align: 'right' as const },
];
