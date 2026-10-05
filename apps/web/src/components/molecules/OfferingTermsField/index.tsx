'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

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

/** Default row appended when the user adds a term. */
const DEFAULT_TERM = { name: '', duration: { amount: 12, units: 'month' } };

/** Editable `productOfferingTerm` array (name + duration); must be used inside a `FormProvider`. */
export function OfferingTermsField() {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'productOfferingTerm' });

  return (
    <div className="space-y-3 border-t border-gray-lightest pt-4">
      <div className="flex items-center justify-between gap-4">
        <Typography as="h4" variant="form-label" className="font-semibold">
          Condiciones de contratación
        </Typography>
        {fields.length === 0 && (
          <button type="button" onClick={() => append(DEFAULT_TERM)} className={addBtnCls}>
            <Icon name="Plus" size={13} aria-hidden="true" />
            Añadir condición
          </button>
        )}
      </div>

      {fields.length === 0 && (
        <Typography variant="small" color="gray">
          Sin condiciones. Añade períodos de permanencia u otras condiciones contractuales.
        </Typography>
      )}

      <ul className="space-y-2" aria-label="Condiciones de contratación">
        {fields.map((field, i) => {
          const nameId = `term-${i}-name`;
          const amountId = `term-${i}-amount`;
          const unitsId = `term-${i}-units`;
          return (
            <li
              key={field.id}
              className="grid grid-cols-[1fr_80px_120px_auto] items-center gap-2 rounded-lg border border-gray-lightest bg-muted px-3 py-2"
            >
              <div>
                <label htmlFor={nameId} className="sr-only">
                  Nombre de la condición {i + 1}
                </label>
                <input
                  id={nameId}
                  {...register(`productOfferingTerm.${i}.name`)}
                  placeholder="Ej: Sin permanencia"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor={amountId} className="sr-only">
                  Duración {i + 1}
                </label>
                <input
                  id={amountId}
                  type="number"
                  min={1}
                  {...register(`productOfferingTerm.${i}.duration.amount`, {
                    valueAsNumber: true,
                  })}
                  placeholder="12"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor={unitsId} className="sr-only">
                  Unidad de tiempo {i + 1}
                </label>
                <select
                  id={unitsId}
                  {...register(`productOfferingTerm.${i}.duration.units`)}
                  className={cn(inputCls, 'cursor-pointer appearance-none')}
                >
                  <option value="day">Días</option>
                  <option value="month">Meses</option>
                  <option value="year">Años</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Eliminar condición ${i + 1}`}
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

export default OfferingTermsField;
