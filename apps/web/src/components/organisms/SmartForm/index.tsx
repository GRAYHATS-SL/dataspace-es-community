import { zodResolver } from '@hookform/resolvers/zod';
import { ReactNode, useEffect, useMemo } from 'react';
import {
  Controller,
  FieldValues,
  FormProvider,
  Path,
  Resolver,
  SubmitHandler,
  useForm,
  UseFormProps,
  UseFormReturn,
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
  /** Predicate for conditional rendering. */
  visible?: (values: T) => boolean;
  /** Fields `visible` depends on. */
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
  /** Used as React key. */
  name: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
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
}

interface OfferingTermsSmartField<T extends FieldValues> {
  type: 'offering-terms';
  name: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
}

interface TaxSmartField<T extends FieldValues> {
  type: 'tax';
  name: string;
  wrapperClassName?: string;
  visible?: (values: T) => boolean;
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
}

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

export interface SmartFormRenderActionsProps {
  isSubmitting: boolean;
  loading: boolean;
  submitText: string;
  onCancel: () => void;
}

export interface SmartFormProps<T extends FieldValues = FieldValues> {
  fields: SmartFormField<T>[];
  schema: ZodType<T>;
  onSubmit: SubmitHandler<T>;
  defaultValues?: UseFormProps<T>['defaultValues'];
  /** Externally controlled values. */
  values?: UseFormProps<T>['values'];
  submitText?: string;
  loading?: boolean;
  columns?: number;
  /** Reset the form after a successful submit. Default: `true`. */
  resetOnSubmit?: boolean;
  onSubmitSuccess?: (data: T) => void;
  onSubmitError?: (error: unknown) => void;
  /** Called once with the react-hook-form instance. */
  onReady?: (methods: UseFormReturn<T>) => void;
  /** Called on cancel. */
  onCancel?: () => void;
  /** Replaces the default actions bar. */
  renderActions?: (props: SmartFormRenderActionsProps) => ReactNode;
  /** Extra content between the fields and the actions. */
  children?: ReactNode | ((methods: UseFormReturn<T>) => ReactNode);
  className?: string;
}

/* ---------------------------------- */
/* Component                          */
/* ---------------------------------- */

/**
 * SmartForm - Generic config-driven form validated with Zod
 *
 * @param {SmartFormField<T>[]} fields - Field definitions.
 * @param {ZodType<T>} schema - Zod validation schema.
 * @param {SubmitHandler<T>} onSubmit - Called with valid data.
 * @param {UseFormProps<T>['defaultValues']} [defaultValues] - Initial values.
 * @param {UseFormProps<T>['values']} [values] - Externally controlled values.
 * @param {string} [submitText] - Default submit button text.
 * @param {boolean} [loading=false] - Forces the submit loading state.
 * @param {number} [columns=1] - Number of grid columns.
 * @param {boolean} [resetOnSubmit=true] - Reset after a successful submit.
 * @param {(data: T) => void} [onSubmitSuccess] - Called after a successful submit.
 * @param {(error: unknown) => void} [onSubmitError] - Called if `onSubmit` throws.
 * @param {(methods: UseFormReturn<T>) => void} [onReady] - Called once on mount.
 * @param {() => void} [onCancel] - Called on cancel.
 * @param {(props: SmartFormRenderActionsProps) => ReactNode} [renderActions] - Replaces the default actions.
 * @param {ReactNode|((methods: UseFormReturn<T>) => ReactNode)} [children] - Extra content.
 * @param {string} [className] - Extra CSS classes.
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
    // Zod v4 + @hookform/resolvers v5 type the schema input as `FieldValues`, whereas `ZodType<T>` leaves it as `unknown`. The cast is kept contained here so as not to weaken the type of the `schema` prop.
    resolver: zodResolver(schema as never) as Resolver<T>,
    defaultValues,
    values,
    mode: 'onTouched',
  });

  const { handleSubmit, control, register, getFieldState, formState, reset } = methods;
  const { isSubmitting } = formState;

  useEffect(() => {
    onReady?.(methods);
    // Intentionally fires only on mount: the RHF internals are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only subscribes to the fields declared in `visibleWhen` (if none declare them, it subscribes to nothing) — avoids re-rendering the whole form on every keystroke when no field uses `visible` (see you-might-not-need-an-effect / RHF useWatch).
  const visibilityDeps = useMemo(
    () =>
      Array.from(
        new Set(fields.flatMap((f) => ('visibleWhen' in f && f.visibleWhen) || [])),
      ) as Path<T>[],
    [fields],
  );
  const watchedArray = useWatch({
    control,
    name: visibilityDeps,
    disabled: visibilityDeps.length === 0,
  }) as unknown[];
  const watchedValues = useMemo(
    () => Object.fromEntries(visibilityDeps.map((name, i) => [name, watchedArray.at(i)])) as T,
    [visibilityDeps, watchedArray],
  );
  const visibleFields = fields.filter((f) => !f.visible || f.visible(watchedValues));

  const renderField = (field: SmartFormField<T>) => {
    if (field.type === 'custom') return field.render(methods);
    if (field.type === 'characteristics-array')
      return (
        <CharacteristicsArrayField
          fieldName={field.fieldName}
          label={field.label}
          emptyMessage={field.emptyMessage}
        />
      );
    if (field.type === 'offering-terms') return <OfferingTermsField />;
    if (field.type === 'tax') return <TaxField />;
    if (field.type === 'tag-input')
      return (
        <TagInputField
          fieldName={field.fieldName}
          label={field.label}
          description={field.description}
          hint={field.hint}
          placeholder={field.placeholder}
        />
      );

    const { isTouched, error } = getFieldState(field.name, formState);
    const errorToShow = isTouched || formState.isSubmitted ? error?.message : undefined;
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
            render={({ field: ctrlField }) => {
              const raw = ctrlField.value;
              let multiValue: string[];
              if (Array.isArray(raw)) {
                multiValue = raw;
              } else {
                multiValue = raw ? [raw] : [];
              }
              return (
                <MultiSelect
                  label={field.label}
                  error={errorToShow}
                  disabled={field.disabled}
                  description={
                    typeof field.description === 'string' ? field.description : undefined
                  }
                  options={field.options}
                  loading={field.loading}
                  name={ctrlField.name}
                  ref={ctrlField.ref}
                  value={multiValue}
                  onChange={ctrlField.onChange}
                  onBlur={ctrlField.onBlur}
                />
              );
            }}
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
                description={typeof field.description === 'string' ? field.description : undefined}
                options={field.options}
                loading={field.loading}
                name={ctrlField.name}
                ref={ctrlField.ref}
                onBlur={ctrlField.onBlur}
                value={ctrlField.value ?? ''}
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
        return (
          <Textarea
            {...commonAtomProps}
            required={field.required}
            {...register(field.name)}
            {...field.props}
          />
        );

      default:
        return (
          <Input
            {...commonAtomProps}
            type={field.type}
            required={field.required}
            {...register(field.name, field.type === 'number' ? { valueAsNumber: true } : undefined)}
            {...field.props}
          />
        );
    }
  };

  let gridContainerClass = 'space-y-4';
  if (columns === 2) gridContainerClass = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  else if (columns === 3) gridContainerClass = 'grid grid-cols-1 sm:grid-cols-3 gap-4';
  else if (columns > 1) gridContainerClass = 'grid gap-4';

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

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleFormSubmit}
        className={['space-y-4', className].filter(Boolean).join(' ')}
        noValidate
      >
        <div className={gridContainerClass}>
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
            <Button type="submit" disabled={isSubmitting || loading} className="mt-4">
              {isSubmitting || loading ? 'Guardando...' : submitText}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || loading}
              onClick={handleCancel}
              className="mt-4"
              variant="outline"
            >
              {isSubmitting || loading ? 'Cancelando...' : 'Cancelar'}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  );
};

export default SmartForm;
