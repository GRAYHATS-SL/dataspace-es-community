'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';

const inputCls =
  'w-full rounded-md border border-gray-lightest bg-white px-3 py-2 text-sm text-primary ' +
  'placeholder:text-gray focus:border-primary focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors resize-none';

const addBtnCls =
  'inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 ' +
  'px-3 min-h-9 text-sm font-medium text-primary hover:bg-primary/5 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors';

const removeBtnCls =
  'flex items-center justify-center min-h-9 min-w-9 rounded text-gray ' +
  'hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40';

/** AgreementCustomTermsField - Editable list of extra agreement terms (`customTerms`); needs a `FormProvider`. */
export function AgreementCustomTermsField() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<AgreementTermsFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'customTerms' });

  return (
    <div className="space-y-3 border-t border-gray-lightest pt-4">
      <div className="flex items-center justify-between gap-4">
        <Typography as="h4" variant="form-label" className="font-semibold">
          Términos adicionales
        </Typography>
        <button type="button" onClick={() => append({ description: '' })} className={addBtnCls}>
          <Icon name="Plus" size={13} aria-hidden="true" />
          Añadir término
        </button>
      </div>

      {fields.length === 0 && (
        <Typography variant="small" color="gray">
          Sin términos adicionales. Añade condiciones específicas de esta oferta.
        </Typography>
      )}

      <ul className="space-y-2" aria-label="Términos adicionales">
        {fields.map((field, i) => {
          const message = errors.customTerms?.[i]?.description?.message;
          return (
            <li
              key={field.id}
              className="flex items-start gap-2 rounded-lg border border-gray-lightest bg-muted px-3 py-2"
            >
              <div className="flex-1">
                <label htmlFor={`custom-term-${i}`} className="sr-only">
                  Término adicional {i + 1}
                </label>
                <textarea
                  id={`custom-term-${i}`}
                  rows={2}
                  {...register(`customTerms.${i}.description`)}
                  placeholder="Describe el término o condición adicional..."
                  className={inputCls}
                />
                {message && (
                  <Typography variant="small" className="mt-1 text-red-600">
                    {message}
                  </Typography>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Eliminar término ${i + 1}`}
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

export default AgreementCustomTermsField;
