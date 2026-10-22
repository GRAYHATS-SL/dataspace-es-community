import { describe, expect, it } from 'vitest';

import {
  ACCESS_CHAR_ID,
  type AccessValue,
  buildAccessChar,
  extractAccessFromSpec,
  findDuplicateEndpointSpec,
} from '@/lib/utils/serviceSpecAccess';
import type { ServiceSpecification } from '@/types/api';

const VALUE: AccessValue = {
  endpoint: 'https://api.ejemplo.com/v1/datos',
  httpMethod: 'GET',
  responseFormat: 'JSON',
  authType: 'apiKey',
  accessInstructions: 'Contacta al soporte',
};

const specWithEndpoint = (id: string, endpoint: string): ServiceSpecification => ({
  id,
  specCharacteristic: [
    {
      id: ACCESS_CHAR_ID,
      name: 'Configuración de acceso',
      characteristicValueSpecification: [{ isDefault: true, value: { endpoint } }],
    },
  ],
});

describe('extractAccessFromSpec', () => {
  it('returns empty fields when the spec has no specCharacteristic', () => {
    expect(extractAccessFromSpec({})).toEqual({
      endpoint: '',
      httpMethod: '',
      responseFormat: '',
      authType: '',
      accessInstructions: '',
    });
  });

  it('returns empty fields when the accessConfig characteristic is absent', () => {
    const spec: ServiceSpecification = {
      specCharacteristic: [{ id: 'otherChar', name: 'x' }],
    };
    expect(extractAccessFromSpec(spec).endpoint).toBe('');
  });

  it('extracts the value of the accessConfig characteristic', () => {
    const spec: ServiceSpecification = {
      specCharacteristic: [
        {
          id: ACCESS_CHAR_ID,
          name: 'Configuración de acceso',
          characteristicValueSpecification: [{ isDefault: true, value: VALUE }],
        },
      ],
    };
    expect(extractAccessFromSpec(spec)).toEqual(VALUE);
  });
});

describe('buildAccessChar', () => {
  it('returns null when every field is empty', () => {
    expect(buildAccessChar({})).toBeNull();
    expect(buildAccessChar({ endpoint: '  ', accessInstructions: '' })).toBeNull();
  });

  it('trims endpoint and accessInstructions, and omits empty fields', () => {
    const char = buildAccessChar({ endpoint: '  https://x.com  ', httpMethod: '' });
    expect(char).toEqual({
      id: ACCESS_CHAR_ID,
      name: 'Configuración de acceso',
      valueType: 'object',
      characteristicValueSpecification: [{ isDefault: true, value: { endpoint: 'https://x.com' } }],
    });
  });

  it('round-trips build -> extract', () => {
    const char = buildAccessChar(VALUE)!;
    const spec: ServiceSpecification = { specCharacteristic: [char] };
    expect(extractAccessFromSpec(spec)).toEqual(VALUE);
  });
});

describe('findDuplicateEndpointSpec', () => {
  const specs: ServiceSpecification[] = [
    specWithEndpoint('svc-1', 'https://api.ejemplo.com/v1/datos'),
    specWithEndpoint('svc-2', 'https://otro.com/v2'),
  ];

  it('returns undefined when the endpoint is empty', () => {
    expect(findDuplicateEndpointSpec('', specs)).toBeUndefined();
    expect(findDuplicateEndpointSpec('   ', specs)).toBeUndefined();
  });

  it('returns undefined when no other spec uses the same endpoint', () => {
    expect(findDuplicateEndpointSpec('https://nuevo.com', specs)).toBeUndefined();
  });

  it('finds an exact duplicate', () => {
    const duplicate = findDuplicateEndpointSpec('https://api.ejemplo.com/v1/datos', specs);
    expect(duplicate?.id).toBe('svc-1');
  });

  it('matches case-insensitively', () => {
    const duplicate = findDuplicateEndpointSpec('HTTPS://API.EJEMPLO.COM/v1/Datos', specs);
    expect(duplicate?.id).toBe('svc-1');
  });

  it('does not treat a trailing slash as equal (exact match beyond case)', () => {
    expect(findDuplicateEndpointSpec('https://api.ejemplo.com/v1/datos/', specs)).toBeUndefined();
  });

  it('excludes the given id (editing the same spec does not count as a duplicate)', () => {
    expect(
      findDuplicateEndpointSpec('https://api.ejemplo.com/v1/datos', specs, 'svc-1'),
    ).toBeUndefined();
  });

  it('still finds a duplicate against a different spec when excluding the current one', () => {
    const withThree = [...specs, specWithEndpoint('svc-3', 'https://api.ejemplo.com/v1/datos')];
    const duplicate = findDuplicateEndpointSpec(
      'https://api.ejemplo.com/v1/datos',
      withThree,
      'svc-1',
    );
    expect(duplicate?.id).toBe('svc-3');
  });
});
