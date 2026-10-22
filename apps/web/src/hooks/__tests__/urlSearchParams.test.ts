import { describe, expect, it } from 'vitest';

import { PAGE_PARAM, withUpdatedParams } from '@/hooks/urlSearchParams';

describe('PAGE_PARAM', () => {
  it('is the string "page"', () => {
    expect(PAGE_PARAM).toBe('page');
  });
});

describe('withUpdatedParams', () => {
  it('sets a new key to its stringified value', () => {
    const current = new URLSearchParams();
    const next = withUpdatedParams(current, { page: 2 });
    expect(next.get('page')).toBe('2');
  });

  it('overwrites an existing key', () => {
    const current = new URLSearchParams('page=1&sort=name');
    const next = withUpdatedParams(current, { page: 3 });
    expect(next.get('page')).toBe('3');
    expect(next.get('sort')).toBe('name');
  });

  it('deletes the key when the update value is undefined', () => {
    const current = new URLSearchParams('page=1');
    const next = withUpdatedParams(current, { page: undefined });
    expect(next.has('page')).toBe(false);
  });

  it('deletes the key when the update value is null', () => {
    const current = new URLSearchParams('page=1');
    const next = withUpdatedParams(current, { page: null });
    expect(next.has('page')).toBe(false);
  });

  it('deletes the key when the update value is an empty string', () => {
    const current = new URLSearchParams('q=hello');
    const next = withUpdatedParams(current, { q: '' });
    expect(next.has('q')).toBe(false);
  });

  it('converts a non-string value via String()', () => {
    const current = new URLSearchParams();
    const next = withUpdatedParams(current, { page: 42, active: true as unknown as string });
    expect(next.get('page')).toBe('42');
    expect(next.get('active')).toBe('true');
  });

  it('applies multiple updates in a single call', () => {
    const current = new URLSearchParams('page=1');
    const next = withUpdatedParams(current, { page: 5, sort: 'name', filter: undefined });
    expect(next.get('page')).toBe('5');
    expect(next.get('sort')).toBe('name');
    expect(next.has('filter')).toBe(false);
  });

  it('does not mutate the input URLSearchParams', () => {
    const current = new URLSearchParams('page=1');
    withUpdatedParams(current, { page: 9, extra: 'value' });
    expect(current.get('page')).toBe('1');
    expect(current.has('extra')).toBe(false);
  });

  it('returns a distinct URLSearchParams instance from the input', () => {
    const current = new URLSearchParams('page=1');
    const next = withUpdatedParams(current, {});
    expect(next).not.toBe(current);
    expect(next.toString()).toBe(current.toString());
  });

  it('serialises special characters so they survive a toString/parse round trip', () => {
    const value = `a&b=c #d %e +f "g" 'h' i/j ñ 日本`;
    const next = withUpdatedParams(new URLSearchParams(), { q: value });
    const query = next.toString();
    expect(query).not.toMatch(/[#\s]/);
    expect(query.split('&')).toHaveLength(1);
    expect(new URLSearchParams(query).get('q')).toBe(value);
  });
});
