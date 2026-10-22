import { describe, expect, it } from 'vitest';

import { formatDid } from '@/lib/utils/formatDid';

describe('formatDid', () => {
  it('truncates a long DID with an ellipsis in the middle', () => {
    const did = 'did:key:zDnaeeSSTVqDMufcjnCztF7iMYALxkCFaR7T34Vc3kfexQoGX';
    expect(formatDid(did)).toBe('did:key:zDna…exQoGX');
  });

  it('returns short values unchanged', () => {
    expect(formatDid('did:key:abc')).toBe('did:key:abc');
  });

  it('returns the original value when it is exactly at the truncation boundary', () => {
    const did = 'a'.repeat(19); // HEAD_CHARS + TAIL_CHARS + 1
    expect(formatDid(did)).toBe(did);
  });

  it('truncates a value one character over the boundary', () => {
    const did = 'a'.repeat(20);
    expect(formatDid(did)).toBe(`${'a'.repeat(12)}…${'a'.repeat(6)}`);
  });

  it('handles an empty string', () => {
    expect(formatDid('')).toBe('');
  });

  it('does not truncate did:web identifiers', () => {
    const did = 'did:web:marketplacev2.dataspace.es';
    expect(formatDid(did)).toBe(did);
  });
});
