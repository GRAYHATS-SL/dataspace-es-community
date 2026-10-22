import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';

export interface RefGroup {
  label: string;
  items: { id: string; name?: string }[];
}

interface DeletePanelProps {
  entityLabel: string;
  entityName?: string;
  refs: RefGroup[];
  onCleanAndDelete: () => void;
  onCancel: () => void;
  isCleaning: boolean;
  isDeleting: boolean;
  cleanError: string | null;
  colCount: number;
}

/**
 * DeletePanel - Delete confirmation panel with optional reference cleanup
 *
 * @param {string} entityLabel - Entity name with article.
 * @param {string} [entityName] - Name of the entity to delete.
 * @param {RefGroup[]} refs - Groups of entities referencing it.
 * @param {() => void} onCleanAndDelete - Confirm callback.
 * @param {() => void} onCancel - Cancel callback.
 * @param {boolean} isCleaning - Whether cleanup is in progress.
 * @param {boolean} isDeleting - Whether deletion is in progress.
 * @param {string|null} cleanError - Cleanup or deletion error message.
 * @param {number} colCount - Number of table columns.
 */
export default function DeletePanel({
  entityLabel,
  entityName,
  refs,
  onCleanAndDelete,
  onCancel,
  isCleaning,
  isDeleting,
  cleanError,
  colCount,
}: Readonly<DeletePanelProps>) {
  const hasRefs = refs.some((g) => g.items.length > 0);
  const isMasculine = entityLabel.startsWith('El ');
  const pronoun = isMasculine ? 'borrarlo' : 'borrarla';
  let confirmLabel = 'Eliminar' + (hasRefs ? ' y limpiar referencias' : '');
  if (isCleaning) confirmLabel = 'Limpiando referencias…';
  else if (isDeleting) confirmLabel = 'Eliminando…';

  return (
    <td colSpan={colCount} className="px-3 py-3">
      <div className="flex gap-4 rounded-lg border border-primary/15 bg-muted px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
          <Icon name="Trash2" size={17} className="text-danger" />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary">
              ¿Eliminar &ldquo;{entityName}&rdquo;?
            </p>
            {hasRefs ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-black">
                  Esta acción también eliminará sus referencias en:
                </p>
                <ul className="space-y-0.5 pl-1">
                  {refs
                    .filter((g) => g.items.length > 0)
                    .map((g) => (
                      <li key={g.label} className="text-sm text-black">
                        <span className="font-medium text-primary">
                          {g.items.length} {g.label}
                        </span>
                        : {g.items.map((i) => i.name ?? i.id).join(', ')}
                      </li>
                    ))}
                </ul>
                <p className="text-xs text-gray">
                  Se limpiarán todas las referencias antes de {pronoun}. Esta acción no se puede
                  deshacer.
                </p>
              </div>
            ) : (
              <p className="text-sm text-black">Esta acción no se puede deshacer.</p>
            )}
          </div>

          {cleanError && (
            <div className="flex items-center gap-1.5 text-sm text-danger">
              <Icon name="AlertCircle" size={14} className="shrink-0" />
              {cleanError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={isCleaning || isDeleting}
              onClick={onCleanAndDelete}
            >
              {confirmLabel}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </td>
  );
}
