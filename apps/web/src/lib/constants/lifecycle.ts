/** Selectable option of a form select. */
export interface LifecycleOption {
  label: string;
  value: 'Active' | 'In design' | 'In test' | 'Launched' | 'Retired' | 'Obsolete';
}

/** Lifecycle statuses offered in the specification forms. */
export const LIFECYCLE_OPTIONS: LifecycleOption[] = [
  { label: 'Activo', value: 'Active' },
  { label: 'En diseño', value: 'In design' },
  { label: 'En pruebas', value: 'In test' },
  { label: 'Publicado', value: 'Launched' },
  { label: 'Retirado', value: 'Retired' },
  { label: 'Obsoleto', value: 'Obsolete' },
];
