'use client';

import { useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import {
  useCreateServiceSpecification,
  usePatchServiceSpecification,
  useServiceSpecifications,
} from '@/hooks/queries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import {
  AUTH_TYPE_OPTIONS,
  RESPONSE_FORMAT_OPTIONS,
  HTTP_METHOD_OPTIONS,
} from '@/lib/constants/productSpec';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  type ServiceSpecificationFormData,
  serviceSpecificationSchema,
} from '@/lib/validations/serviceSpecification.schema';
import type {
  NewServiceSpecification,
  ServiceSpecCharacteristic,
  ServiceSpecification,
} from '@/types/api';

/** Props of `ServiceSpecForm`. */
export interface ServiceSpecFormProps {
  onClose: () => void;
  onSuccess?: (spec: ServiceSpecification) => void;
  editingServiceSpec?: ServiceSpecification | null;
}

type AccessFields = Pick<
  ServiceSpecificationFormData,
  'endpoint' | 'httpMethod' | 'responseFormat' | 'authType' | 'accessInstructions'
>;

/** Maps the access method fields to service specification characteristics. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildAccessCharacteristics(_data: AccessFields): ServiceSpecCharacteristic[] {
  // Here you define your business logic (how the access method is stored in the API).
  return [];
}

/** Reads the access method of an existing specification back into the form. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractAccessFields(_spec: ServiceSpecification): AccessFields {
  // Here you define your business logic (inverse of `buildAccessCharacteristics`).
  return {};
}

/** Returns a validation message when the submission must be blocked (e.g. duplicated endpoint). */
function validateServiceSpec(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _data: ServiceSpecificationFormData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _existing: ServiceSpecification[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _editingId?: string,
): string | null {
  // Here you define your business logic (duplicate endpoint checks...).
  return null;
}

/** Maps the form values to the service specification payload. */
function buildServiceSpecPayload(
  data: ServiceSpecificationFormData,
): Partial<NewServiceSpecification> {
  const characteristics = buildAccessCharacteristics(data);
  // Here you define your business logic (default values, derived fields...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    lifecycleStatus: data.lifecycleStatus,
    ...(characteristics.length > 0 && { specCharacteristic: characteristics }),
  };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(
  spec?: ServiceSpecification | null,
): Partial<ServiceSpecificationFormData> {
  if (!spec) return {};
  return {
    name: spec.name ?? '',
    description: spec.description ?? '',
    lifecycleStatus: LIFECYCLE_OPTIONS.find((o) => o.value === spec.lifecycleStatus)?.value,
    ...extractAccessFields(spec),
  };
}

/** Create/edit form of a service specification with its access method. */
const ServiceSpecForm = ({
  onClose,
  onSuccess,
  editingServiceSpec,
}: Readonly<ServiceSpecFormProps>) => {
  const createMutation = useCreateServiceSpecification();
  const patchMutation = usePatchServiceSpecification();
  const { data: serviceSpecs = [] } = useServiceSpecifications();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingServiceSpec?.id;
  const isPending = createMutation.isPending || patchMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear especificación';

  const handleSubmit = async (data: ServiceSpecificationFormData) => {
    setSubmitError(null);
    const validationError = validateServiceSpec(data, serviceSpecs, editingServiceSpec?.id);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    const payload = buildServiceSpecPayload(data);
    const spec =
      isEditing && editingServiceSpec.id
        ? await patchMutation.mutateAsync({ id: editingServiceSpec.id, payload })
        : await createMutation.mutateAsync(payload);
    onSuccess?.(spec);
    onClose();
  };

  return (
    <SmartForm<ServiceSpecificationFormData>
      key={editingServiceSpec?.id ?? 'new'}
      fields={[
        { name: 'name', type: 'text', label: 'Nombre', required: true, wrapperClassName: 'col-span-1' },
        {
          name: 'lifecycleStatus',
          type: 'select',
          label: 'Estado',
          placeholder: 'Selecciona un estado',
          wrapperClassName: 'col-span-1',
          options: LIFECYCLE_OPTIONS,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
        {
          name: 'access-section-header',
          type: 'custom',
          wrapperClassName: 'col-span-2',
          render: () => (
            <div className="border-t border-gray-lightest pt-4">
              <p className="text-sm font-semibold text-primary">Método de acceso</p>
              <p className="text-xs text-gray">
                Cómo los compradores consumirán este servicio tras obtener acceso
              </p>
            </div>
          ),
        },
        {
          name: 'endpoint',
          type: 'text',
          label: 'URL del endpoint',
          placeholder: 'https://api.example.com/v1/datos',
          wrapperClassName: 'col-span-2',
        },
        {
          name: 'httpMethod',
          type: 'select',
          label: 'Método HTTP',
          placeholder: 'Selecciona un método',
          wrapperClassName: 'col-span-1',
          options: HTTP_METHOD_OPTIONS,
        },
        {
          name: 'responseFormat',
          type: 'select',
          label: 'Formato de respuesta',
          placeholder: 'Selecciona un formato',
          wrapperClassName: 'col-span-1',
          options: RESPONSE_FORMAT_OPTIONS,
        },
        {
          name: 'authType',
          type: 'select',
          label: 'Autenticación',
          placeholder: 'Selecciona el tipo',
          wrapperClassName: 'col-span-1',
          options: AUTH_TYPE_OPTIONS,
        },
        {
          name: 'accessInstructions',
          type: 'textarea',
          label: 'Instrucciones de acceso',
          placeholder:
            'Explica cómo el comprador obtendrá las credenciales o el acceso al servicio tras la compra…',
          wrapperClassName: 'col-span-2',
          props: { rows: 3 },
        },
      ]}
      columns={2}
      schema={serviceSpecificationSchema}
      defaultValues={getDefaultValues(editingServiceSpec)}
      onSubmit={handleSubmit}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={isPending ? 'Guardando…' : idleLabel}
      loading={isPending}
      onCancel={onClose}
      resetOnSubmit={!isEditing}
    >
      {submitError && (
        <Typography variant="small" className="text-danger" role="alert">
          {submitError}
        </Typography>
      )}
    </SmartForm>
  );
};

export default ServiceSpecForm;
