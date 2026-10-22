import { describe, expect, it } from 'vitest';

import {
  buildTokenOfferConfigChar,
  extractTokenOfferConfig,
  mergeTokenOfferConfigChar,
  TOKEN_OFFER_CONFIG_CHAR_ID,
  type TokenOfferConfig,
} from '../tokenOfferConfig';

const CONFIG: TokenOfferConfig = {
  maxRequests: 1000,
  maxTransferTB: 5,
  supplyMode: 'escaso',
  supply: 20,
  tokenOfferStatus: 'draft',
};

describe('buildTokenOfferConfigChar', () => {
  it('returns null when there is no config to persist', () => {
    expect(buildTokenOfferConfigChar(undefined)).toBeNull();
  });

  it('serializes the config into a single object-valued characteristic', () => {
    const char = buildTokenOfferConfigChar(CONFIG);
    expect(char).toEqual({
      id: TOKEN_OFFER_CONFIG_CHAR_ID,
      name: 'Configuración de tokenización',
      valueType: 'object',
      productSpecCharacteristicValue: [{ isDefault: true, value: CONFIG }],
    });
  });
});

describe('extractTokenOfferConfig', () => {
  it('returns undefined for a spec without the characteristic (non-tokenized offering)', () => {
    expect(extractTokenOfferConfig(undefined)).toBeUndefined();
    expect(extractTokenOfferConfig({ productSpecCharacteristic: [] })).toBeUndefined();
  });

  it('round-trips build -> extract', () => {
    const char = buildTokenOfferConfigChar(CONFIG)!;
    const extracted = extractTokenOfferConfig({ productSpecCharacteristic: [char] });
    expect(extracted).toEqual(CONFIG);
  });

  it('ignores other characteristics on the spec', () => {
    const char = buildTokenOfferConfigChar(CONFIG)!;
    const extracted = extractTokenOfferConfig({
      productSpecCharacteristic: [{ id: 'datasetMetadata', valueType: 'object' }, char],
    });
    expect(extracted).toEqual(CONFIG);
  });
});

describe('mergeTokenOfferConfigChar', () => {
  it('preserves other characteristics (e.g. datasetMetadata) when adding the token char', () => {
    const metaChar = { id: 'datasetMetadata', valueType: 'object' as const };
    const merged = mergeTokenOfferConfigChar({ productSpecCharacteristic: [metaChar] }, CONFIG);
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.id === 'datasetMetadata')).toEqual(metaChar);
    expect(extractTokenOfferConfig({ productSpecCharacteristic: merged })).toEqual(CONFIG);
  });

  it('replaces a previous token characteristic instead of duplicating it', () => {
    const first = mergeTokenOfferConfigChar(undefined, CONFIG);
    const updated: TokenOfferConfig = { ...CONFIG, tokenOfferStatus: 'published' };
    const merged = mergeTokenOfferConfigChar({ productSpecCharacteristic: first }, updated);
    expect(merged).toHaveLength(1);
    expect(extractTokenOfferConfig({ productSpecCharacteristic: merged })).toEqual(updated);
  });

  it('drops the token characteristic when value is undefined, keeping the rest', () => {
    const metaChar = { id: 'datasetMetadata', valueType: 'object' as const };
    const tokenChar = buildTokenOfferConfigChar(CONFIG)!;
    const merged = mergeTokenOfferConfigChar(
      { productSpecCharacteristic: [metaChar, tokenChar] },
      undefined,
    );
    expect(merged).toEqual([metaChar]);
  });
});
