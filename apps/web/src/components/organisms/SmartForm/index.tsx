'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useMemo } from 'react';
import {
  Controller,
  type FieldValues,
  FormProvider,
  type Path,
  type Resolver,
  type SubmitHandler,
  useForm,
  type UseFormProps,
  type UseFormReturn,
  useWatch,
} from 'react-hook-form';
import type { ZodType } from 'zod';

import Button from '@/components/atoms/Button';
import { Checkbox, type CheckboxProps } from '@/components/atoms/FormCheckbox';
import { Select, type SelectProps } from '@/components/atoms/FormSelect';
import { Textarea, type TextareaProps } from '@/components/atoms/FormTextarea';
import Input, { type InputProps } from '@/components/atoms/Input';
import { CharacteristicsArrayField } from '@/components/molecules/CharacteristicsArrayField';
import { MultiSelect } from '@/components/molecules/FormMultiSelect';
import { OfferingTermsField } from '@/components/molecules/OfferingTermsField';
import { TagInputField } from '@/components/molecules/TagInputField';
import { TaxField } from '@/components/molecules/TaxField';

/* ---------------------------------- */
/* Types                              */
/* ---------------------------------- */

/** Option of a `select` / `multiselect` field. */
export type SmartFormOption = { value: string; label: string; description?: string };

type InputFieldType = 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';

interface BaseField<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  description?: ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  wrapperClassName?: string;
  /** Conditional rendering predicate; receives the watched values. */
  visible?: (values: T) => boolean;
  /** Fields `visible` depends on, so `useWatch` only subscribes to them. */
  visibleWhen?: Path<T>[];
}

interface TextField<T extends FieldValues> extends BaseField<T> {
  type: InputFieldType;
  props?: Partial<InputProps>;
}

interface TextareaField<T extends FieldValues> extends BaseField<T> {
  type: 'textarea';
  props?: Partial<TextareaProps>;
}

interface SelectField<T extends FieldValues> extends BaseField<T> {
  type: 'select' | 'multiselect';
  options: SmartFormOption[];
  props?: Partial<SelectProps>;
}

interface CheckboxField<T extends FieldValues> extends BaseField<T> {
  type: 'checkbox';
  props?: Partial<CheckboxProps>;
}

interface CustomField<T extends FieldValues> {
  type: 'custom';
  /** Used as React key; it does not need to be a `Path<T>`. */
  name: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
  visibleWhen?: Path<T>[];
  render: (methods: UseFormReturn<T>) => ReactNode;
}

interface CharacteristicsArraySmartField<T extends FieldValues> {
  type: 'characteristics-array';
  name: string;
  fieldName: string;
  label?: string;
  emptyMessage?: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
  visibleWhen?: Path<T>[];
}

interface OfferingTermsSmartField<T extends FieldValues> {
  type: 'offering-terms';
  name: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
  visibleWhen?: Path<T>[];
}

interface TaxSmartField<T extends FieldValues> {
  type: 'tax';
  name: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
  visibleWhen?: Path<T>[];
}

interface TagInputSmartField<T extends FieldValues> {
  type: 'tag-input';
  name: string;
  fieldName: string;
  label: string;
  description?: string;
  hint?: string;
  placeholder?: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
  visibleWhen?: Path<T>[];
}

/** Declarative field definition accepted by `SmartForm`. */
export type SmartFormField<T extends FieldValues = FieldValues> =
  | TextField<T>
  | TextareaField<T>
  | SelectField<T>
  | CheckboxField<T>
  | CustomField<T>
  | CharacteristicsArraySmartField<T>
  | OfferingTermsSmartField<T>
  | TaxSmartField<T>
  | TagInputSmartField<T>;

/** Arguments passed to `renderActions`. */
export interface SmartFormRenderActionsProps {
  isSubmitting: boolean;
  loading: boolean;
  submitText: string;
  onCancel: () => void;
}

/** Props of `SmartForm`. */
export interface SmartFormProps<T extends FieldValues = FieldValues> {
  fields: SmartFormField<T>[];
  schema: ZodType<T>;
  onSubmit: SubmitHandler<T>;
  defaultValues?: UseFormProps<T>['defaultValues'];
  /** Values controlled from outside (edit flows). */
  values?: UseFormProps<T>['values'];
  submitText?: string;
  loading?: boolean;
  columns?: number;
  /** Reset the form when the submit resolves without error. Default: `true`. */
  resetOnSubmit?: boolean;
  onSubmitSuccess?: (data: T) => void;
  onSubmitError?: (error: unknown) => void;
  /** Called once with the react-hook-form instance (`watch`, `setValue`...). */
  onReady?: (methods: UseFormReturn<T>) => void;
  /** Called on cancel, after resetting the form. */
  onCancel?: () => void;
  /** Replaces the default action bar. */
  renderActions?: (props: SmartFormRenderActionsProps) => ReactNode;
  /** Extra content rendered between the fields and the actions. */
  children?: ReactNode | ((methods: UseFormReturn<T>) => ReactNode);
  className?: string;
}

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

const toMultiValue = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw as string[];
  return raw ? [String(raw)] : [];
};

const gridClassFor = (columns: number): string => {
  if (columns === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  if (columns === 3) return 'grid grid-cols-1 sm:grid-cols-3 gap-4';
  if (columns > 1) return 'grid gap-4';
  return 'space-y-4';
};

/** Renders the specialised sub-form fields; returns `undefined` for regular inputs. */
function renderSpecialField<T extends FieldValues>(
  field: SmartFormField<T>,
  methods: UseFormReturn<T>,
): ReactNode | undefined {
  switch (field.type) {
    case 'custom':
      return field.render(methods);
    case 'characteristics-array':
      return (
        <CharacteristicsArrayField
          fieldName={field.fieldName}
          label={field.label}
          emptyMessage={field.emptyMessage}
        />
      );
    case 'offering-terms':
      return <OfferingTermsField />;
    case 'tax':
      return <TaxField />;
    case 'tag-input':
      return (
        <TagInputField
          fieldName={field.fieldName}
          label={field.label}
          description={field.description}
          hint={field.hint}
          placeholder={field.placeholder}
        />
      );
    default:
      return undefined;
  }
}

/* ---------------------------------- */
/* Component                          */
/* ---------------------------------- */

/**
 * SmartForm - Configuration-driven form (`fields`) validated with Zod.
 * Supports text/textarea/select/multiselect/checkbox, custom fields and specialised sub-forms
 * (`characteristics-array`, `offering-terms`, `tax`, `tag-input`). Conditional visibility only
 * subscribes to the fields declared in `visibleWhen`.
 */
export const SmartForm = <T extends FieldValues = FieldValues>({
  fields,
  schema,
  onSubmit,
  defaultValues,
  values,
  submitText = 'Guardar',
  loading = false,
  columns = 1,
  resetOnSubmit = true,
  onSubmitSuccess,
  onSubmitError,
  onReady,
  onCancel,
  renderActions,
  children,
  className,
}: Readonly<SmartFormProps<T>>) => {
  const methods = useForm<T>({
    // Zod v4 + @hookform/resolvers v5 type the schema input as `FieldValues` while
    // `ZodType<T>` leaves it as `unknown`; the cast stays contained here.
    resolver: zodResolver(schema as never) as Resolver<T>,
    defaultValues,
    values,
    mode: 'onTouched',
  });

  const { handleSubmit, control, register, getFieldState, formState, reset } = methods;
  const { isSubmitting } = formState;

  useEffect(() => {
    onReady?.(methods);
    // Intentionally fired only on mount: react-hook-form internals are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only subscribe to the fields declared in `visibleWhen` (none → no subscription).
  const visibilityDeps = useMemo(
    () => Array.from(new Set(fields.flatMap((f) => f.visibleWhen ?? []))),
    [fields],
  );
  const watchedArray = useWatch({
    control,
    name: visibilityDeps,
    disabled: visibilityDeps.length === 0,
  }) as unknown[];
  const watchedValues = useMemo(
    () => Object.fromEntries(visibilityDeps.map((name, i) => [name, watchedArray[i]])) as T,
    [visibilityDeps, watchedArray],
  );
  const visibleFields = fields.filter((f) => !f.visible || f.visible(watchedValues));

  const renderInputField = (field: TextField<T> | TextareaField<T> | SelectField<T> | CheckboxField<T>) => {
    const { isTouched, error } = getFieldState(field.name, formState);
    const errorToShow = isTouched || formState.isSubmitted ? error?.message : undefined;
    const stringDescription = typeof field.description === 'string' ? field.description : undefined;
    const commonAtomProps = {
      label: field.label,
      error: errorToShow,
      disabled: field.disabled,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required,
    };

    switch (field.type) {
      case 'multiselect':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: ctrlField }) => (
              <MultiSelect
                label={field.label}
                error={errorToShow}
                disabled={field.disabled}
                description={stringDescription}
                options={field.options}
                loading={field.loading}
                name={ctrlField.name}
                ref={ctrlField.ref}
                value={toMultiValue(ctrlField.value)}
                onChange={ctrlField.onChange}
                onBlur={ctrlField.onBlur}
              />
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: ctrlField }) => (
              <Select
                {...commonAtomProps}
                description={stringDescription}
                options={field.options}
                loading={field.loading}
                name={ctrlField.name}
                ref={ctrlField.ref}
                onBlur={ctrlField.onBlur}
                value={(ctrlField.value as string | undefined) ?? ''}
                onChange={(e) => ctrlField.onChange(e.target.value)}
                {...field.props}
              />
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: ctrlField }) => (
              <Checkbox
                {...commonAtomProps}
                name={ctrlField.name}
                ref={ctrlField.ref}
                onBlur={ctrlField.onBlur}
                checked={Boolean(ctrlField.value)}
                onChange={(e) => ctrlField.onChange(e.target.checked)}
                {...field.props}
              />
            )}
          />
        );

      case 'textarea':
        return <Textarea {...commonAtomProps} {...register(field.name)} {...field.props} />;

      default:
        return (
          <Input
            {...commonAtomProps}
            type={field.type}
            {...register(field.name, field.type === 'number' ? { valueAsNumber: true } : undefined)}
            {...field.props}
          />
        );
    }
  };

  const renderField = (field: SmartFormField<T>) => {
    const special = renderSpecialField(field, methods);
    if (special !== undefined) return special;
    return renderInputField(
      field as TextField<T> | TextareaField<T> | SelectField<T> | CheckboxField<T>,
    );
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  const handleFormSubmit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      onSubmitSuccess?.(data);
      if (resetOnSubmit) reset();
    } catch (error) {
      onSubmitError?.(error);
    }
  });

  const resolvedChildren = typeof children === 'function' ? children(methods) : children;
  const busy = isSubmitting || loading;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleFormSubmit}
        className={['space-y-4', className].filter(Boolean).join(' ')}
        noValidate
      >
        <div className={gridClassFor(columns)}>
          {visibleFields.map((field) => {
            const spanFullClass = columns > 1 && !field.wrapperClassName ? 'col-span-full' : '';
            return (
              <div
                key={String(field.name)}
                className={['space-y-1', spanFullClass, field.wrapperClassName]
                  .filter(Boolean)
                  .join(' ')}
              >
                {renderField(field)}
              </div>
            );
          })}
        </div>

        {resolvedChildren}

        {renderActions ? (
          renderActions({ isSubmitting, loading, submitText, onCancel: handleCancel })
        ) : (
          <div className="flex gap-2.5">
            <Button type="submit" disabled={busy} className="mt-4">
              {busy ? 'Guardando...' : submitText}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={handleCancel}
              className="mt-4"
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  );
};

export default SmartForm;
