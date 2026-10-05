'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

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

/** Default row appended when the user adds a tax. */
const DEFAULT_TAX = { taxCategory: '', taxRate: 0 };

/** Editable `tax` array (category + rate) of a price; must be used inside a `FormProvider`. */
export function TaxField() {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'tax' });

  return (
    <div className="space-y-3 border-t border-gray-lightest pt-4">
      <div className="flex items-center justify-between gap-4">
        <Typography as="h4" variant="form-label" className="font-semibold">
          Impuestos
        </Typography>
        {fields.length === 0 && (
          <button type="button" onClick={() => append(DEFAULT_TAX)} className={addBtnCls}>
            <Icon name="Plus" size={13} aria-hidden="true" />
            Añadir impuesto
          </button>
        )}
      </div>

      {fields.length === 0 && (
        <Typography variant="small" color="gray">
          Sin impuestos configurados.
        </Typography>
      )}

      <ul className="space-y-2" aria-label="Impuestos">
        {fields.map((field, i) => {
          const catId = `tax-${i}-category`;
          const rateId = `tax-${i}-rate`;
          return (
            <li
              key={field.id}
              className="grid grid-cols-[1fr_140px_auto] items-center gap-2 rounded-lg border border-gray-lightest bg-muted px-3 py-2"
            >
              <div>
                <label htmlFor={catId} className="sr-only">
                  Categoría del impuesto {i + 1}
                </label>
                <input
                  id={catId}
                  {...register(`tax.${i}.taxCategory`)}
                  placeholder="Ej: IVA"
                  className={inputCls}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={rateId} className="sr-only">
                  Tasa del impuesto {i + 1} en porcentaje
                </label>
                <input
                  id={rateId}
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  {...register(`tax.${i}.taxRate`, { valueAsNumber: true })}
                  placeholder="0"
                  className={inputCls}
                />
                <span className="shrink-0 text-sm text-gray" aria-hidden="true">
                  %
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Eliminar impuesto ${i + 1}`}
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

export default TaxField;
