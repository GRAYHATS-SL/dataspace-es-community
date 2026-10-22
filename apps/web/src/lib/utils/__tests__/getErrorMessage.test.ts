import { describe, expect, it } from 'vitest';

import { getErrorMessage } from '@/lib/utils/getErrorMessage';

describe('getErrorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(getErrorMessage(new Error('HTTP 400: bad request'))).toBe('HTTP 400: bad request');
  });

  it('falls back to the default message when the Error has an empty message', () => {
    expect(getErrorMessage(new Error(''))).toBe('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
  });

  it('falls back to the default message for a non-Error value', () => {
    expect(getErrorMessage('plain string error')).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    );
  });

  it('falls back to the default message for null and undefined', () => {
    expect(getErrorMessage(null)).toBe('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
    expect(getErrorMessage(undefined)).toBe('Ha ocurrido un error inesperado. Inténtalo de nuevo.');
  });

  it('falls back to the default message for a plain object', () => {
    expect(getErrorMessage({ message: 'not a real Error' })).toBe(
      'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    );
  });
});
