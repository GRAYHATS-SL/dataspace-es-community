'use client';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

// Same tokens as the Input/Select atoms for visual consistency.
const inputCls =
  'w-full rounded-md border border-gray-lightest bg-white px-3 py-2 text-sm text-primary ' +
  'placeholder:text-gray focus:border-primary focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors';

const addBtnCls =
  'inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 ' +
  'px-3 min-h-9 text-sm font-medium text-primary hover:bg-primary/5 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors';

const removeBtnCls =
  'flex items-center justify-center min-h-11 min-w-11 rounded text-gray ' +
  'hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40';

/** Value input of a characteristic; its type follows the row's `valueType`. */
function CharValueInput({ fieldName, index }: Readonly<{ fieldName: string; index: number }>) {
  const { register, control } = useFormContext();
  const valueType = useWatch({ control, name: `${fieldName}.${index}.valueType` }) as
    | string
    | undefined;
  const id = `${fieldName}-${index}-value`;

  if (valueType === 'boolean') {
    return (
      <>
        <label htmlFor={id} className="sr-only">
          Valor {index + 1}
        </label>
        <select
          id={id}
          {...register(`${fieldName}.${index}.value`)}
          className={cn(inputCls, 'cursor-pointer appearance-none')}
        >
          <option value="">—</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </>
    );
  }

  if (valueType === 'object') {
    return (
      <>
        <label htmlFor={id} className="sr-only">
          Valor {index + 1}
        </label>
        <input
          id={id}
          disabled
          placeholder="Objeto (vía API)"
          title="Los valores de tipo objeto se definen directamente vía API"
          className={cn(inputCls, 'cursor-not-allowed opacity-40')}
        />
      </>
    );
  }

  const isNumber = valueType === 'number';
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Valor {index + 1}
      </label>
      <input
        id={id}
        type={isNumber ? 'number' : 'text'}
        step={isNumber ? 'any' : undefined}
        {...register(`${fieldName}.${index}.value`)}
        placeholder={isNumber ? '0' : 'Valor'}
        className={inputCls}
      />
    </>
  );
}

/** Props of `CharacteristicsArrayField`. */
export interface CharacteristicsArrayFieldProps {
  fieldName: string;
  label?: string;
  emptyMessage?: string;
}

/** Editable list of characteristics (name, type, value); must be used inside a `FormProvider`. */
export function CharacteristicsArrayField({
  fieldName,
  label = 'Características',
  emptyMessage = 'Sin características definidas. Añade una para describir atributos (velocidad, capacidad, formato…).',
}: Readonly<CharacteristicsArrayFieldProps>) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: fieldName });

  return (
    <div className="space-y-3 border-t border-gray-lightest pt-4">
      <div className="flex items-center justify-between gap-4">
        <Typography as="h4" variant="form-label" className="font-semibold">
          {label}
        </Typography>
        <button
          type="button"
          onClick={() =>
            append({
              name: '',
              description: '',
              valueType: 'string',
              configurable: false,
              isUnique: false,
              value: '',
            })
          }
          className={addBtnCls}
        >
          <Icon name="Plus" size={13} aria-hidden="true" /> Añadir característica
        </button>
      </div>

      {fields.length === 0 && (
        <Typography variant="small" color="gray">
          {emptyMessage}
        </Typography>
      )}

      <ul className="space-y-2" aria-label={label}>
        {fields.map((field, i) => {
          const nameId = `${fieldName}-${i}-name`;
          const typeId = `${fieldName}-${i}-type`;
          return (
            <li
              key={field.id}
              className="grid grid-cols-[1fr_120px_1fr_auto] items-center gap-2 rounded-lg border border-gray-lightest bg-muted px-3 py-2"
            >
              <div>
                <label htmlFor={nameId} className="sr-only">
                  Nombre del atributo {i + 1}
                </label>
                <input
                  id={nameId}
                  {...register(`${fieldName}.${i}.name`)}
                  placeholder="Nombre del atributo"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor={typeId} className="sr-only">
                  Tipo de valor {i + 1}
                </label>
                <select
                  id={typeId}
                  {...register(`${fieldName}.${i}.valueType`)}
                  className={cn(inputCls, 'cursor-pointer appearance-none')}
                >
                  <option value="string">Texto</option>
                  <option value="number">Número</option>
                  <option value="boolean">Sí / No</option>
                  <option value="object">Objeto</option>
                </select>
              </div>
              <div>
                <CharValueInput fieldName={fieldName} index={i} />
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Eliminar característica ${i + 1}`}
                className={removeBtnCls}
              >
                <Icon name="X" size={14} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default CharacteristicsArrayField;
