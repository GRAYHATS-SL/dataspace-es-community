import Icon from '@/components/atoms/Icon';

/** Props of `ActiveChip`. */
export interface ActiveChipProps {
  label: string;
  onRemove: () => void;
}

/** ActiveChip - Removable chip that represents an active filter. */
const ActiveChip = ({ label, onRemove }: Readonly<ActiveChipProps>) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary">
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Eliminar filtro ${label}`}
      className="flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-primary/15"
    >
      <Icon name="X" size={10} aria-hidden="true" />
    </button>
  </span>
);

export default ActiveChip;
