import type { ProductSpecification, ProductSpecificationCharacteristic } from '@/types/api';

export const TOKEN_OFFER_CONFIG_CHAR_ID = 'tokenOfferConfig';

export type TokenOfferSupplyMode = 'escaso' | 'abundante';
export type TokenOfferStatus = 'draft' | 'published' | 'paused' | 'exhausted' | 'retired';
export type TokenPricingMode = 'fijo' | 'dinamico';

export interface TokenOfferConfig {
  maxRequests: number;
  maxTransferTB: number;
  supplyMode: TokenOfferSupplyMode;
  /** Only if supplyMode === 'escaso'. */
  supply?: number;
  tokenOfferStatus: TokenOfferStatus;
}

export const extractTokenOfferConfig = (
  spec: ProductSpecification | undefined,
): TokenOfferConfig | undefined => {
  const char = spec?.productSpecCharacteristic?.find((c) => c.id === TOKEN_OFFER_CONFIG_CHAR_ID);
  const value = char?.productSpecCharacteristicValue?.[0]?.value;
  return value && typeof value === 'object' ? (value as unknown as TokenOfferConfig) : undefined;
};

export const buildTokenOfferConfigChar = (
  value: TokenOfferConfig | undefined,
): ProductSpecificationCharacteristic | null => {
  if (!value) return null;
  return {
    id: TOKEN_OFFER_CONFIG_CHAR_ID,
    name: 'Configuración de tokenización',
    valueType: 'object',
    productSpecCharacteristicValue: [
      { isDefault: true, value: value as unknown as Record<string, unknown> },
    ],
  };
};

/** Rebuilds the full `productSpecCharacteristic` array, replacing or adding the tokenization characteristic. */
export const mergeTokenOfferConfigChar = (
  spec: ProductSpecification | undefined,
  value: TokenOfferConfig | undefined,
): ProductSpecificationCharacteristic[] => {
  const others = (spec?.productSpecCharacteristic ?? []).filter(
    (c) => c.id !== TOKEN_OFFER_CONFIG_CHAR_ID,
  );
  const tokenChar = buildTokenOfferConfigChar(value);
  return tokenChar ? [...others, tokenChar] : others;
};
