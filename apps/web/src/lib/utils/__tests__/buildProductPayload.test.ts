import { describe, expect, it } from 'vitest';

import { buildProductPayload } from '@/lib/utils/buildProductPayload';
import type { TokenOfferConfig } from '@/lib/utils/tokenOfferConfig';
import type { Agreement, ProductOrder } from '@/types/api';

// Fixtures

const BASE_AGREEMENT: Agreement = {
  id: 'urn:ngsi-ld:agreement:agr1',
  name: 'Acuerdo dataset X',
  agreementType: 'commercial',
  engagedParty: [
    { id: 'urn:ngsi-ld:organization:buyer1', role: 'buyer', '@referredType': 'Organization' },
    { id: 'urn:ngsi-ld:organization:seller1', role: 'seller', '@referredType': 'Organization' },
  ],
  agreementItem: [
    {
      productOffering: [{ id: 'urn:ngsi-ld:product-offering:off1', name: 'Oferta dataset X' }],
    },
  ],
  characteristic: [
    { name: 'agreementStartDate', value: '2026-05-19T00:00:00.000Z' },
    { name: 'agreementEndDate', value: '2027-05-19T00:00:00.000Z' },
  ],
};

const BASE_ORDER: ProductOrder = {
  id: 'urn:ngsi-ld:product-order:ord1',
  productOrderItem: [{ id: 'item-0', action: 'add' }],
};

// Tests

describe('buildProductPayload', () => {
  it('sets status to "active" by default', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.status).toBe('active');
  });

  it('respects a custom status argument', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER, 'pendingActive');
    expect(payload.status).toBe('pendingActive');
  });

  it('uses the offering name as product name', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.name).toBe('Oferta dataset X');
  });

  it('falls back to agreement name when offering has no name', () => {
    const agreement: Agreement = {
      ...BASE_AGREEMENT,
      agreementItem: [{ productOffering: [{ id: 'urn:ngsi-ld:product-offering:off1' }] }],
    };
    const payload = buildProductPayload(agreement, BASE_ORDER);
    expect(payload.name).toBe('Acuerdo dataset X');
  });

  it('uses agreementStartDate characteristic for startDate', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.startDate).toBe('2026-05-19T00:00:00.000Z');
  });

  it('falls back to today when agreementStartDate characteristic is absent', () => {
    const agreement: Agreement = { ...BASE_AGREEMENT, characteristic: [] };
    const before = new Date().toISOString();
    const payload = buildProductPayload(agreement, BASE_ORDER);
    const after = new Date().toISOString();
    expect(payload.startDate! >= before).toBe(true);
    expect(payload.startDate! <= after).toBe(true);
  });

  it('includes terminationDate when agreementEndDate characteristic is present', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.terminationDate).toBe('2027-05-19T00:00:00.000Z');
  });

  it('omits terminationDate when agreementEndDate characteristic is absent', () => {
    const agreement: Agreement = {
      ...BASE_AGREEMENT,
      characteristic: [{ name: 'agreementStartDate', value: '2026-05-19T00:00:00.000Z' }],
    };
    const payload = buildProductPayload(agreement, BASE_ORDER);
    expect(payload.terminationDate).toBeUndefined();
  });

  it('includes productOffering ref when agreementItem has an offering', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.productOffering).toEqual({ id: 'urn:ngsi-ld:product-offering:off1' });
  });

  it('omits productOffering when agreementItem has no offering', () => {
    const agreement: Agreement = { ...BASE_AGREEMENT, agreementItem: [{}] };
    const payload = buildProductPayload(agreement, BASE_ORDER);
    expect(payload.productOffering).toBeUndefined();
  });

  it('copies engagedParty from agreement as relatedParty', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.relatedParty).toEqual(BASE_AGREEMENT.engagedParty);
  });

  it('includes agreement ref with agreementItemId "0"', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.agreement).toEqual([{ id: 'urn:ngsi-ld:agreement:agr1', agreementItemId: '0' }]);
  });

  it('includes productOrderItem when order and orderItem are present', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.productOrderItem).toEqual([
      {
        productOrderId: 'urn:ngsi-ld:product-order:ord1',
        orderItemId: 'item-0',
        orderItemAction: 'add',
        role: 'subscription',
      },
    ]);
  });

  it('omits productOrderItem when order is null', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, null);
    expect(payload.productOrderItem).toBeUndefined();
  });

  it('omits productOrderItem when order has no id', () => {
    const order: ProductOrder = { ...BASE_ORDER, id: undefined };
    const payload = buildProductPayload(BASE_AGREEMENT, order);
    expect(payload.productOrderItem).toBeUndefined();
  });

  it('omits productOrderItem when order has no items', () => {
    const order: ProductOrder = { ...BASE_ORDER, productOrderItem: [] };
    const payload = buildProductPayload(BASE_AGREEMENT, order);
    expect(payload.productOrderItem).toBeUndefined();
  });

  it('includes productCharacteristic with tokenLimits when tokenConfig is provided', () => {
    const tokenConfig: TokenOfferConfig = {
      maxRequests: 1000,
      maxTransferTB: 5,
      supplyMode: 'escaso',
      supply: 10,
      tokenOfferStatus: 'published',
    };
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER, 'active', tokenConfig);
    expect(payload.productCharacteristic).toEqual([
      {
        id: 'tokenLimits',
        name: 'Límites del token',
        valueType: 'object',
        value: { maxRequests: 1000, maxTransferTB: 5 },
      },
    ]);
  });

  it('omits productCharacteristic when tokenConfig is not provided', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.productCharacteristic).toBeUndefined();
  });

  it('includes productPrice from the order itemPrice, defaulting unit to EUR when absent', () => {
    const order: ProductOrder = {
      ...BASE_ORDER,
      productOrderItem: [{ id: 'item-0', action: 'add', itemPrice: [{ value: 42 }] }],
    };
    const payload = buildProductPayload(BASE_AGREEMENT, order);
    expect(payload.productPrice).toEqual([{ price: { value: 42, unit: 'EUR' } }]);
  });

  it('uses the itemPrice unit when present instead of the EUR default', () => {
    const order: ProductOrder = {
      ...BASE_ORDER,
      productOrderItem: [{ id: 'item-0', action: 'add', itemPrice: [{ value: 42, unit: 'USD' }] }],
    };
    const payload = buildProductPayload(BASE_AGREEMENT, order);
    expect(payload.productPrice).toEqual([{ price: { value: 42, unit: 'USD' } }]);
  });

  it('includes productPrice when itemPrice.value is 0', () => {
    const order: ProductOrder = {
      ...BASE_ORDER,
      productOrderItem: [{ id: 'item-0', action: 'add', itemPrice: [{ value: 0 }] }],
    };
    const payload = buildProductPayload(BASE_AGREEMENT, order);
    expect(payload.productPrice).toEqual([{ price: { value: 0, unit: 'EUR' } }]);
  });

  it('omits productPrice when the order has no itemPrice', () => {
    const payload = buildProductPayload(BASE_AGREEMENT, BASE_ORDER);
    expect(payload.productPrice).toBeUndefined();
  });
});
