import { describe, expect, it } from 'vitest';

import { getLoginErrorMessage } from '@/lib/utils/loginErrors';

describe('getLoginErrorMessage', () => {
  it.each([
    'invalid_request',
    'invalid_state',
    'token_exchange_failed',
    'token_missing',
    'invalid_token',
    'session_expired',
  ])('returns a message for the known code %s', (code) => {
    expect(getLoginErrorMessage(code)).toEqual(expect.any(String));
  });

  it('returns null for missing codes', () => {
    expect(getLoginErrorMessage(null)).toBeNull();
    expect(getLoginErrorMessage(undefined)).toBeNull();
    expect(getLoginErrorMessage('')).toBeNull();
  });

  it('returns null for unknown codes and never reflects the input', () => {
    expect(getLoginErrorMessage('<script>alert(1)</script>')).toBeNull();
  });

  it('ignores inherited object properties', () => {
    expect(getLoginErrorMessage('toString')).toBeNull();
    expect(getLoginErrorMessage('__proto__')).toBeNull();
  });
});
