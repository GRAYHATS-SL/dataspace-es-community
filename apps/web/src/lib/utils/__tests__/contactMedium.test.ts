import { describe, expect, it } from 'vitest';

import { replaceContactMedium } from '@/lib/utils/contactMedium';
import type { ContactMedium } from '@/types/api';

describe('replaceContactMedium', () => {
  it('adds the entry when existing is undefined', () => {
    const entry: ContactMedium = { mediumType: 'postal', characteristic: { city: 'Madrid' } };
    expect(replaceContactMedium(undefined, 'postal', entry)).toEqual([entry]);
  });

  it('adds the entry when no entry of that mediumType exists', () => {
    const existing: ContactMedium[] = [
      { mediumType: 'email', characteristic: { emailAddress: 'a@b.com' } },
    ];
    const entry: ContactMedium = { mediumType: 'postal', characteristic: { city: 'Madrid' } };
    expect(replaceContactMedium(existing, 'postal', entry)).toEqual([...existing, entry]);
  });

  it('replaces the existing entry of that mediumType', () => {
    const existing: ContactMedium[] = [
      { mediumType: 'postal', characteristic: { city: 'Barcelona' } },
    ];
    const entry: ContactMedium = { mediumType: 'postal', characteristic: { city: 'Madrid' } };
    expect(replaceContactMedium(existing, 'postal', entry)).toEqual([entry]);
  });

  it('preserves entries of other mediumTypes', () => {
    const existing: ContactMedium[] = [
      { mediumType: 'email', characteristic: { emailAddress: 'a@b.com' } },
      { mediumType: 'phone', characteristic: { phoneNumber: '+34600000000' } },
      { mediumType: 'postal', characteristic: { city: 'Barcelona' } },
    ];
    const entry: ContactMedium = { mediumType: 'postal', characteristic: { city: 'Madrid' } };
    expect(replaceContactMedium(existing, 'postal', entry)).toEqual([existing[0], existing[1], entry]);
  });

  it('does not mutate the original array', () => {
    const existing: ContactMedium[] = [
      { mediumType: 'postal', characteristic: { city: 'Barcelona' } },
    ];
    const copy = [...existing];
    replaceContactMedium(existing, 'postal', { mediumType: 'postal', characteristic: {} });
    expect(existing).toEqual(copy);
  });
});
