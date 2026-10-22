import type { ServiceSpecCharacteristic, ServiceSpecification } from '@/types/api';

export const ACCESS_CHAR_ID = 'accessConfig';

export type AccessValue = {
  endpoint?: string;
  httpMethod?: string;
  responseFormat?: string;
  authType?: string;
  accessInstructions?: string;
};

export const extractAccessFromSpec = (spec: ServiceSpecification): AccessValue => {
  const char = spec.specCharacteristic?.find((c) => c.id === ACCESS_CHAR_ID);
  const value = (char?.characteristicValueSpecification?.[0]?.value ?? {}) as AccessValue;
  return {
    endpoint: value.endpoint ?? '',
    httpMethod: value.httpMethod ?? '',
    responseFormat: value.responseFormat ?? '',
    authType: value.authType ?? '',
    accessInstructions: value.accessInstructions ?? '',
  };
};

export const buildAccessChar = (data: AccessValue): ServiceSpecCharacteristic | null => {
  const value: AccessValue = {};
  if (data.endpoint?.trim()) value.endpoint = data.endpoint.trim();
  if (data.httpMethod) value.httpMethod = data.httpMethod;
  if (data.responseFormat) value.responseFormat = data.responseFormat;
  if (data.authType) value.authType = data.authType;
  if (data.accessInstructions?.trim()) value.accessInstructions = data.accessInstructions.trim();
  if (Object.keys(value).length === 0) return null;
  return {
    id: ACCESS_CHAR_ID,
    name: 'Configuración de acceso',
    valueType: 'object',
    characteristicValueSpecification: [{ isDefault: true, value }],
  };
};

/** Infrastructure restriction: two services of the same provider cannot point to the same endpoint. */
export const findDuplicateEndpointSpec = (
  endpoint: string,
  serviceSpecs: ServiceSpecification[],
  excludeId?: string,
): ServiceSpecification | undefined => {
  const target = endpoint.trim().toLowerCase();
  if (!target) return undefined;
  return serviceSpecs.find((spec) => {
    if (spec.id === excludeId) return false;
    return extractAccessFromSpec(spec).endpoint?.trim().toLowerCase() === target;
  });
};
