'use client';

import { useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import {
  useCreateServiceSpecification,
  usePatchServiceSpecification,
} from '@/hooks/queries/useServiceSpecificationQueries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import {
  AUTH_TYPE_OPTIONS,
  DISTRIBUTION_FORMAT_OPTIONS,
  HTTP_METHOD_OPTIONS,
} from '@/lib/constants/productSpec';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  buildAccessChar,
  extractAccessFromSpec,
  findDuplicateEndpointSpec,
} from '@/lib/utils/serviceSpecAccess';
import {
  ServiceSpecificationFormData,
  serviceSpecificationSchema,
  UpdateServiceSpecificationFormData,
  updateServiceSpecificationSchema,
} from '@/lib/validations/serviceSpecification.schema';
import type { ServiceSpecification } from '@/types/api';

const ACCESS_SECTION_HEADER = {
  name: 'access-section-header',
  type: 'custom' as const,
  wrapperClassName: 'col-span-2',
  render: () => (
    <div className="border-t border-gray-lightest pt-4">
      <p className="text-sm font-semibold text-primary">Método de acceso</p>
      <p className="text-xs text-gray">
        Cómo los compradores consumirán este servicio tras obtener acceso
      </p>
    </div>
  ),
};

interface ServiceSpecFormProps {
  onClose: () => void;
  editingServiceSpec?: ServiceSpecification | null;
  serviceSpecs: ServiceSpecification[];
}

const ServiceSpecForm = ({
  onClose,
  editingServiceSpec,
  serviceSpecs,
}: Readonly<ServiceSpecFormProps>) => {
  const isEditing = !!editingServiceSpec;
  const createMutation = useCreateServiceSpecification();
  const patchMutation = usePatchServiceSpecification();
  const isPending = createMutation.isPending || patchMutation.isPending;
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isEditing) {
    return (
      <SmartForm<UpdateServiceSpecificationFormData>
        key={editingServiceSpec.id}
        fields={[
          {
            name: 'name',
            type: 'text',
            label: 'Nombre',
            required: true,
            wrapperClassName: 'col-span-1',
          },
          {
            name: 'description',
            type: 'textarea',
            label: 'Descripción',
            wrapperClassName: 'col-span-2',
            props: { rows: 2 },
          },
          {
            name: 'lifecycleStatus',
            type: 'select',
            label: 'Estado',
            placeholder: 'Selecciona un estado',
            wrapperClassName: 'col-span-1',
            options: LIFECYCLE_OPTIONS as unknown as { label: string; value: string }[],
          },
          ACCESS_SECTION_HEADER,
          {
            name: 'endpoint',
            type: 'text',
            label: 'URL del endpoint',
            placeholder: 'https://api.ejemplo.com/v1/datos',
            wrapperClassName: 'col-span-2',
          },
          {
            name: 'httpMethod',
            type: 'select',
            label: 'Método HTTP',
            placeholder: 'Selecciona un método',
            wrapperClassName: 'col-span-1',
            options: HTTP_METHOD_OPTIONS as unknown as { label: string; value: string }[],
          },
          {
            name: 'responseFormat',
            type: 'select',
            label: 'Formato de respuesta',
            placeholder: 'Selecciona un formato',
            wrapperClassName: 'col-span-1',
            options: DISTRIBUTION_FORMAT_OPTIONS as unknown as { label: string; value: string }[],
          },
          {
            name: 'authType',
            type: 'select',
            label: 'Autenticación',
            placeholder: 'Selecciona el tipo',
            wrapperClassName: 'col-span-1',
            options: AUTH_TYPE_OPTIONS as unknown as { label: string; value: string }[],
          },
          {
            name: 'accessInstructions',
            type: 'textarea',
            label: 'Instrucciones de acceso',
            placeholder:
              'Explica cómo el comprador obtendrá las credenciales o acceso al servicio tras la compra…',
            wrapperClassName: 'col-span-2',
            props: { rows: 3 },
          },
        ]}
        columns={2}
        schema={updateServiceSpecificationSchema}
        defaultValues={(() => {
          const access = extractAccessFromSpec(editingServiceSpec);
          return {
            name: editingServiceSpec.name ?? '',
            description: editingServiceSpec.description ?? '',
            lifecycleStatus:
              editingServiceSpec.lifecycleStatus as UpdateServiceSpecificationFormData['lifecycleStatus'],
            endpoint: access.endpoint,
            httpMethod: access.httpMethod as UpdateServiceSpecificationFormData['httpMethod'],
            responseFormat: access.responseFormat,
            authType: access.authType as UpdateServiceSpecificationFormData['authType'],
            accessInstructions: access.accessInstructions,
          };
        })()}
        resetOnSubmit={false}
        onSubmit={async (data) => {
          if (data.endpoint) {
            const duplicate = findDuplicateEndpointSpec(
              data.endpoint,
              serviceSpecs,
              editingServiceSpec.id,
            );
            if (duplicate) {
              // Thrown (not `return`ed): SmartForm treats it as an error and does not reset the form.
              throw new Error(
                `Ya tienes otro servicio ("${duplicate.name}") con esta URL de endpoint.`,
              );
            }
          }
          const accessChar = buildAccessChar(data);
          await patchMutation.mutateAsync({
            id: editingServiceSpec.id!,
            payload: {
              name: data.name?.trim() || undefined,
              description: data.description?.trim() || undefined,
              lifecycleStatus: data.lifecycleStatus,
              ...(accessChar && { specCharacteristic: [accessChar] }),
            },
          });
          onClose();
        }}
        onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
        submitText={isPending ? 'Guardando…' : 'Guardar cambios'}
        loading={isPending}
        onCancel={onClose}
      >
        {submitError && (
          <Typography variant="small" className="text-danger" role="alert">
            {submitError}
          </Typography>
        )}
      </SmartForm>
    );
  }

  return (
    <SmartForm<ServiceSpecificationFormData>
      fields={[
        {
          name: 'name',
          type: 'text',
          label: 'Nombre',
          required: true,
          wrapperClassName: 'col-span-1',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
        {
          name: 'lifecycleStatus',
          type: 'select',
          label: 'Estado',
          placeholder: 'Selecciona un estado',
          wrapperClassName: 'col-span-1',
          options: LIFECYCLE_OPTIONS as unknown as { label: string; value: string }[],
        },
        ACCESS_SECTION_HEADER,
        {
          name: 'endpoint',
          type: 'text',
          label: 'URL del endpoint',
          placeholder: 'https://api.ejemplo.com/v1/datos',
          wrapperClassName: 'col-span-2',
        },
        {
          name: 'httpMethod',
          type: 'select',
          label: 'Método HTTP',
          placeholder: 'Selecciona un método',
          wrapperClassName: 'col-span-1',
          options: HTTP_METHOD_OPTIONS as unknown as { label: string; value: string }[],
        },
        {
          name: 'responseFormat',
          type: 'select',
          label: 'Formato de respuesta',
          placeholder: 'Selecciona un formato',
          wrapperClassName: 'col-span-1',
          options: DISTRIBUTION_FORMAT_OPTIONS as unknown as { label: string; value: string }[],
        },
        {
          name: 'authType',
          type: 'select',
          label: 'Autenticación',
          placeholder: 'Selecciona el tipo',
          wrapperClassName: 'col-span-1',
          options: AUTH_TYPE_OPTIONS as unknown as { label: string; value: string }[],
        },
        {
          name: 'accessInstructions',
          type: 'textarea',
          label: 'Instrucciones de acceso',
          placeholder:
            'Explica cómo el comprador obtendrá las credenciales o acceso al servicio tras la compra…',
          wrapperClassName: 'col-span-2',
          props: { rows: 3 },
        },
      ]}
      columns={2}
      schema={serviceSpecificationSchema}
      onSubmit={async (data) => {
        if (data.endpoint) {
          const duplicate = findDuplicateEndpointSpec(data.endpoint, serviceSpecs);
          if (duplicate) {
            // Thrown (not `return`ed): SmartForm treats it as an error and does not reset the form.
            throw new Error(
              `Ya tienes otro servicio ("${duplicate.name}") con esta URL de endpoint.`,
            );
          }
        }
        const accessChar = buildAccessChar(data);
        await createMutation.mutateAsync({
          name: data.name,
          ...(data.description && { description: data.description }),
          ...(data.lifecycleStatus && { lifecycleStatus: data.lifecycleStatus }),
          ...(accessChar && { specCharacteristic: [accessChar] }),
        });
        onClose();
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={createMutation.isPending ? 'Creando…' : 'Crear especificación'}
      loading={createMutation.isPending}
      onCancel={onClose}
      resetOnSubmit
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
