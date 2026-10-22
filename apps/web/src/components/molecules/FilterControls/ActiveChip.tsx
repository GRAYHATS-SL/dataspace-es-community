import Icon from '@/components/atoms/Icon';

export interface ActiveChipProps {
  label: string;
  onRemove: () => void;
}

/**
 * ActiveChip - Removable chip for an active filter
 *
 * @param {string} label - Active filter text.
 * @param {() => void} onRemove - Remove callback.
 */
const ActiveChip = ({ label, onRemove }: Readonly<ActiveChipProps>) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary">
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Eliminar filtro ${label}`}
      className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/15 transition-colors"
    >
      <Icon name="X" size={10} aria-hidden="true" />
    </button>
  </span>
);

export default ActiveChip;
