'use client';

import { useId, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

const inputCls =
  'w-full rounded-md border border-gray-lightest bg-white px-3 py-2 text-sm text-primary ' +
  'placeholder:text-gray focus:border-primary focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors';

const addBtnCls =
  'inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/40 ' +
  'px-3 min-h-9 shrink-0 text-sm font-medium text-primary hover:bg-primary/5 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors';

/** Props of `TagInputField`. */
export interface TagInputFieldProps {
  fieldName: string;
  label: string;
  description?: string;
  hint?: string;
  placeholder?: string;
}

/** Free-text tag list (added with Enter, removable one by one); must be used inside a `FormProvider`. */
export function TagInputField({
  fieldName,
  label,
  description,
  hint,
  placeholder = 'Añade una etiqueta…',
}: Readonly<TagInputFieldProps>) {
  const { setValue, control } = useFormContext();
  const tags = (useWatch({ control, name: fieldName }) as string[] | undefined) ?? [];
  const [inputValue, setInputValue] = useState('');
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  const addTag = () => {
    const val = inputValue.trim();
    if (val && !tags.includes(val)) {
      setValue(fieldName, [...tags, val]);
      setInputValue('');
    }
  };

  const removeTag = (idx: number) => {
    setValue(
      fieldName,
      tags.filter((_, i) => i !== idx),
    );
  };

  return (
    <div className="space-y-2 border-t border-gray-lightest pt-4">
      <div>
        <label htmlFor={inputId}>
          <Typography as="span" variant="form-label" className="font-semibold">
            {label}
          </Typography>
        </label>
        {description && (
          <Typography variant="form-description" color="gray" className="mt-0.5">
            {description}
          </Typography>
        )}
      </div>

      <div className="flex gap-2">
        <input
          id={inputId}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          className={inputCls}
        />
        <button type="button" onClick={addTag} className={addBtnCls}>
          Añadir
        </button>
      </div>

      {hint && (
        <Typography id={hintId} variant="form-hint" color="gray">
          {hint}
        </Typography>
      )}

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-0.5" aria-label={`${label} añadidas`}>
          {tags.map((tag, i) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                aria-label={`Eliminar ${tag}`}
                className="ml-0.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
              >
                <Icon name="X" size={10} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TagInputField;
