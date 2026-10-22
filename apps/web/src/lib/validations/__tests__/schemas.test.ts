import { describe, expect, it } from 'vitest';

import { agreementTermsSchema } from '@/lib/validations/agreement.schema';
import { catalogSchema, updateCatalogSchema } from '@/lib/validations/catalog.schema';
import { categorySchema, updateCategorySchema } from '@/lib/validations/category.schema';
import {
  corporateEmailSchema,
  emailSchema,
  emailWithConsentSchema,
} from '@/lib/validations/email.schema';
import { individualProfileSchema } from '@/lib/validations/individual.schema';
import { onboardingSchema } from '@/lib/validations/onboarding.schema';
import {
  contractManagementSchema,
  fiscalDataSchema,
  stripeAccountSchema,
} from '@/lib/validations/organization.schema';
import {
  productOfferingSchema,
  updateProductOfferingSchema,
} from '@/lib/validations/productOffering.schema';
import {
  productOfferingPriceSchema,
  updateProductOfferingPriceSchema,
} from '@/lib/validations/productOfferingPrice.schema';
import {
  orderDetailsSchema,
  productOrderSchema,
  updateProductOrderSchema,
} from '@/lib/validations/productOrder.schema';
import {
  productSpecificationSchema,
  updateProductSpecificationSchema,
} from '@/lib/validations/productSpecification.schema';
import {
  resourceSpecCharacteristicSchema,
  resourceSpecificationSchema,
  updateResourceSpecificationSchema,
} from '@/lib/validations/resourceSpecification.schema';
import { reviewCommentSchema } from '@/lib/validations/reviewComment.schema';
import {
  serviceSpecificationSchema,
  updateServiceSpecificationSchema,
} from '@/lib/validations/serviceSpecification.schema';
import {
  attachmentSchema,
  optionalPercentageSchema,
  productOfferingTermSchema,
  taxItemSchema,
  unitOfMeasureSchema,
  validForSchema,
} from '@/lib/validations/shared.schema';

// ---------------------------------------------------------------------------
// catalogSchema
// ---------------------------------------------------------------------------
describe('catalogSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(catalogSchema.safeParse({ name: 'My Catalog' }).success).toBe(true);
  });

  it('rejects when name is empty', () => {
    expect(catalogSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects when name is missing', () => {
    expect(catalogSchema.safeParse({}).success).toBe(false);
  });
});

describe('updateCatalogSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateCatalogSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// categorySchema
// ---------------------------------------------------------------------------
describe('categorySchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(categorySchema.safeParse({ name: 'Electronics' }).success).toBe(true);
  });

  it('rejects when name is empty', () => {
    expect(categorySchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('accepts optional parentId', () => {
    expect(categorySchema.safeParse({ name: 'Sub', parentId: 'cat-1' }).success).toBe(true);
  });
});

describe('updateCategorySchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateCategorySchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// product offering schema
// ---------------------------------------------------------------------------
describe('product offering schema', () => {
  const valid = { name: 'Data Offer', productSpecification: 'spec-1' };

  it('accepts a minimal valid payload', () => {
    expect(productOfferingSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when name is missing', () => {
    expect(productOfferingSchema.safeParse({ productSpecification: 'spec-1' }).success).toBe(false);
  });

  it('rejects when productSpecification is missing', () => {
    expect(productOfferingSchema.safeParse({ name: 'Offer' }).success).toBe(false);
  });

  it('rejects when productSpecification is empty string', () => {
    expect(
      productOfferingSchema.safeParse({ name: 'Offer', productSpecification: '' }).success,
    ).toBe(false);
  });

  it('accepts valid lifecycleStatus enum values', () => {
    const statuses = ['Active', 'In design', 'In test', 'Launched', 'Retired', 'Obsolete'];
    for (const s of statuses) {
      expect(productOfferingSchema.safeParse({ ...valid, lifecycleStatus: s }).success).toBe(true);
    }
  });

  it('rejects an invalid lifecycleStatus value', () => {
    expect(productOfferingSchema.safeParse({ ...valid, lifecycleStatus: 'Borrador' }).success).toBe(
      false,
    );
  });
});

describe('update product offering schema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateProductOfferingSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// productOfferingPriceSchema
// ---------------------------------------------------------------------------
describe('productOfferingPriceSchema', () => {
  const valid = {
    name: 'Free tier',
    priceType: 'one time' as const,
    price: { value: 0, unit: 'EUR' },
  };

  it('accepts a minimal valid payload with price 0', () => {
    expect(productOfferingPriceSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a negative price value', () => {
    expect(
      productOfferingPriceSchema.safeParse({ ...valid, price: { value: -1, unit: 'EUR' } }).success,
    ).toBe(false);
  });

  it('rejects an invalid priceType', () => {
    expect(
      productOfferingPriceSchema.safeParse({ ...valid, priceType: 'subscription' }).success,
    ).toBe(false);
  });

  it('rejects a price unit other than EUR', () => {
    expect(
      productOfferingPriceSchema.safeParse({ ...valid, price: { value: 10, unit: 'USD' } }).success,
    ).toBe(false);
  });

  it('defaults price unit to EUR when omitted', () => {
    const result = productOfferingPriceSchema.safeParse({ ...valid, price: { value: 10 } });
    expect(result.success).toBe(true);
    expect(result.success && result.data.price.unit).toBe('EUR');
  });
});

describe('update product offering price schema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateProductOfferingPriceSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// productOfferingPriceSchema — token pricing
// ---------------------------------------------------------------------------
describe('productOfferingPriceSchema — token pricing', () => {
  const base = {
    name: 'Token dinámico',
    priceType: 'one time' as const,
    price: { value: 25, unit: 'EUR' },
  };

  it('accepts fixed mode without floor/cap', () => {
    expect(
      productOfferingPriceSchema.safeParse({ ...base, tokenPricingMode: 'fijo' }).success,
    ).toBe(true);
  });

  it('accepts dynamic mode with abundant supply (no tokenSupply needed)', () => {
    expect(
      productOfferingPriceSchema.safeParse({
        ...base,
        tokenPricingMode: 'dinamico',
        tokenSupplyMode: 'abundante',
        tokenFloor: 25,
        tokenCap: 75,
        tokenGamma: 1.8,
        tokenKd: 0.6,
      }).success,
    ).toBe(true);
  });

  it('accepts dynamic mode when floor <= price.value <= cap', () => {
    expect(
      productOfferingPriceSchema.safeParse({
        ...base,
        tokenPricingMode: 'dinamico',
        tokenSupplyMode: 'escaso',
        tokenFloor: 25,
        tokenCap: 75,
        tokenGamma: 1.8,
        tokenKd: 0.6,
        tokenSupply: 20,
      }).success,
    ).toBe(true);
  });

  it('rejects dynamic mode when price.value is above cap', () => {
    expect(
      productOfferingPriceSchema.safeParse({
        ...base,
        price: { value: 100, unit: 'EUR' },
        tokenPricingMode: 'dinamico',
        tokenFloor: 25,
        tokenCap: 75,
      }).success,
    ).toBe(false);
  });

  it('rejects dynamic mode when price.value is below floor', () => {
    expect(
      productOfferingPriceSchema.safeParse({
        ...base,
        price: { value: 10, unit: 'EUR' },
        tokenPricingMode: 'dinamico',
        tokenFloor: 25,
        tokenCap: 75,
      }).success,
    ).toBe(false);
  });

  it('rejects dynamic mode when floor > cap', () => {
    expect(
      productOfferingPriceSchema.safeParse({
        ...base,
        tokenPricingMode: 'dinamico',
        tokenFloor: 80,
        tokenCap: 75,
      }).success,
    ).toBe(false);
  });

  it('rejects dynamic mode when floor/cap are missing', () => {
    expect(
      productOfferingPriceSchema.safeParse({ ...base, tokenPricingMode: 'dinamico' }).success,
    ).toBe(false);
  });

  it('rejects scarce supply without a token count', () => {
    expect(
      productOfferingPriceSchema.safeParse({
        ...base,
        tokenPricingMode: 'dinamico',
        tokenSupplyMode: 'escaso',
        tokenFloor: 25,
        tokenCap: 75,
      }).success,
    ).toBe(false);
  });
});

// The data quality block (accuracy/completeness/consistency/credibility/timeliness) is mandatory in productSpecificationSchema -- it is added to every payload expected to have `success: true`.
const VALID_QUALITY_FIELDS = {
  accuracy: 90,
  completeness: 90,
  consistency: 90,
  credibility: 90,
  timeliness: 90,
  // Access policy v2: the path regex is always required.
  odrlPathRegex: '^/anything/.*$',
};

// ---------------------------------------------------------------------------
// productSpecificationSchema
// ---------------------------------------------------------------------------
describe('productSpecificationSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(
      productSpecificationSchema.safeParse({ name: 'Data Spec', ...VALID_QUALITY_FIELDS }).success,
    ).toBe(true);
  });

  it('accepts an empty productSpecCharacteristic array', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        productSpecCharacteristic: [],
        ...VALID_QUALITY_FIELDS,
      }).success,
    ).toBe(true);
  });

  it('rejects when name is missing', () => {
    expect(productSpecificationSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid lifecycleStatus value', () => {
    expect(
      productSpecificationSchema.safeParse({ name: 'Spec', lifecycleStatus: 'Draft' }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// productSpecificationSchema — access policy v2 (ODRL)
// ---------------------------------------------------------------------------
describe('productSpecificationSchema — access policy (v2)', () => {
  const parse = (extra: Record<string, unknown>) =>
    productSpecificationSchema.safeParse({ name: 'Spec', ...VALID_QUALITY_FIELDS, ...extra });
  const issuePaths = (extra: Record<string, unknown>) => {
    const r = parse(extra);
    return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
  };

  it('accepts an unlimited policy (regex only)', () => {
    expect(parse({}).success).toBe(true);
  });

  it('accepts offerId + both limits (also as numeric strings from the form)', () => {
    expect(
      parse({ odrlOfferId: 'httpbin-cuota', odrlBytesLimit: '51200', odrlRequestsLimit: 20 })
        .success,
    ).toBe(true);
  });

  it('accepts offerId + only bytes, and offerId + only requests', () => {
    expect(parse({ odrlOfferId: 'a1', odrlBytesLimit: 100 }).success).toBe(true);
    expect(parse({ odrlOfferId: 'a1', odrlRequestsLimit: 5 }).success).toBe(true);
  });

  it('rejects a missing or blank path regex', () => {
    expect(issuePaths({ odrlPathRegex: undefined })).toContain('odrlPathRegex');
    expect(issuePaths({ odrlPathRegex: '   ' })).toContain('odrlPathRegex');
  });

  it('rejects a path regex that does not compile', () => {
    expect(issuePaths({ odrlPathRegex: '^/(unclosed' })).toContain('odrlPathRegex');
  });

  it('rejects limits without offerId', () => {
    expect(issuePaths({ odrlBytesLimit: 100 })).toContain('odrlOfferId');
    expect(issuePaths({ odrlRequestsLimit: 10, odrlOfferId: '  ' })).toContain('odrlOfferId');
  });

  it('rejects offerId without any limit', () => {
    expect(issuePaths({ odrlOfferId: 'solo-id' })).toContain('odrlBytesLimit');
  });

  it('rejects an offerId with special characters, leading dash or more than 64 chars', () => {
    expect(issuePaths({ odrlOfferId: 'con espacio', odrlBytesLimit: 1 })).toContain('odrlOfferId');
    expect(issuePaths({ odrlOfferId: '-inicio', odrlBytesLimit: 1 })).toContain('odrlOfferId');
    expect(issuePaths({ odrlOfferId: 'a'.repeat(65), odrlBytesLimit: 1 })).toContain('odrlOfferId');
    expect(parse({ odrlOfferId: 'a'.repeat(64), odrlBytesLimit: 1 }).success).toBe(true);
  });

  it('rejects non-positive or non-integer limits', () => {
    expect(issuePaths({ odrlOfferId: 'a', odrlBytesLimit: 0 })).toContain('odrlBytesLimit');
    expect(issuePaths({ odrlOfferId: 'a', odrlBytesLimit: -5 })).toContain('odrlBytesLimit');
    expect(issuePaths({ odrlOfferId: 'a', odrlRequestsLimit: 1.5 })).toContain('odrlRequestsLimit');
  });

  it('treats blank limit inputs as undefined', () => {
    expect(parse({ odrlBytesLimit: '', odrlRequestsLimit: '' }).success).toBe(true);
  });

  it('no longer knows the removed v1 fields (stripped, never required)', () => {
    const r = parse({ odrlExpiresAt: '2026-12-31', odrlEndpointUrl: 'not-a-url' });
    expect(r.success).toBe(true);
    expect(r.success && 'odrlEndpointUrl' in r.data).toBe(false);
    expect(r.success && 'odrlExpiresAt' in r.data).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// productSpecificationSchema — tokenization limits
// ---------------------------------------------------------------------------
describe('productSpecificationSchema — tokenization', () => {
  it('accepts a non-tokenized spec without token fields', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        tokenized: false,
        ...VALID_QUALITY_FIELDS,
      }).success,
    ).toBe(true);
  });

  it('accepts a tokenized spec with abundant supply', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        tokenized: true,
        tokenMaxRequests: 1000,
        tokenMaxTransferTB: 5,
        tokenSupplyMode: 'abundante',
        ...VALID_QUALITY_FIELDS,
      }).success,
    ).toBe(true);
  });

  it('accepts a tokenized spec with scarce supply >= 1', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        tokenized: true,
        tokenMaxRequests: 1000,
        tokenMaxTransferTB: 5,
        tokenSupplyMode: 'escaso',
        tokenSupply: 1,
        ...VALID_QUALITY_FIELDS,
      }).success,
    ).toBe(true);
  });

  it('rejects a tokenized spec missing maxRequests', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        tokenized: true,
        tokenMaxTransferTB: 5,
      }).success,
    ).toBe(false);
  });

  it('rejects a tokenized spec missing maxTransferTB', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        tokenized: true,
        tokenMaxRequests: 1000,
      }).success,
    ).toBe(false);
  });

  it('rejects scarce supply without a supply number', () => {
    expect(
      productSpecificationSchema.safeParse({
        name: 'Spec',
        tokenized: true,
        tokenMaxRequests: 1000,
        tokenMaxTransferTB: 5,
        tokenSupplyMode: 'escaso',
      }).success,
    ).toBe(false);
  });
});

describe('updateProductSpecificationSchema', () => {
  it('accepts an object with only the (always required) path regex', () => {
    expect(updateProductSpecificationSchema.safeParse({ odrlPathRegex: '^/a$' }).success).toBe(
      true,
    );
  });

  it('rejects an empty object: the path regex is required also when editing', () => {
    expect(updateProductSpecificationSchema.safeParse({}).success).toBe(false);
  });

  it('applies the same limits/offerId rules when editing', () => {
    expect(
      updateProductSpecificationSchema.safeParse({ odrlPathRegex: '^/a$', odrlBytesLimit: 10 })
        .success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resourceSpecificationSchema
// ---------------------------------------------------------------------------
describe('resourceSpecificationSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(resourceSpecificationSchema.safeParse({ name: 'S3 Bucket' }).success).toBe(true);
  });

  it('accepts an empty resourceSpecCharacteristic array', () => {
    expect(
      resourceSpecificationSchema.safeParse({ name: 'S3', resourceSpecCharacteristic: [] }).success,
    ).toBe(true);
  });

  it('rejects when name is missing', () => {
    expect(resourceSpecificationSchema.safeParse({}).success).toBe(false);
  });

  it('accepts valid lifecycleStatus enum values', () => {
    const statuses = ['Active', 'In design', 'In test', 'Launched', 'Retired', 'Obsolete'];
    for (const s of statuses) {
      expect(
        resourceSpecificationSchema.safeParse({ name: 'S3', lifecycleStatus: s }).success,
      ).toBe(true);
    }
  });

  it('rejects an invalid lifecycleStatus value', () => {
    expect(
      resourceSpecificationSchema.safeParse({ name: 'S3', lifecycleStatus: 'Borrador' }).success,
    ).toBe(false);
  });
});

describe('updateResourceSpecificationSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateResourceSpecificationSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resourceSpecCharacteristicSchema
// ---------------------------------------------------------------------------
describe('resourceSpecCharacteristicSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(resourceSpecCharacteristicSchema.safeParse({ name: 'Capacity' }).success).toBe(true);
  });

  it('rejects when name is missing', () => {
    expect(resourceSpecCharacteristicSchema.safeParse({}).success).toBe(false);
  });

  it('rejects when name is empty', () => {
    expect(resourceSpecCharacteristicSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// serviceSpecificationSchema
// ---------------------------------------------------------------------------
describe('serviceSpecificationSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(serviceSpecificationSchema.safeParse({ name: 'Auth Service' }).success).toBe(true);
  });

  it('rejects when name is missing', () => {
    expect(serviceSpecificationSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a valid endpoint URL', () => {
    expect(
      serviceSpecificationSchema.safeParse({ name: 'Auth', endpoint: 'https://api.example.com' })
        .success,
    ).toBe(true);
  });

  it('accepts an empty string endpoint', () => {
    expect(serviceSpecificationSchema.safeParse({ name: 'Auth', endpoint: '' }).success).toBe(true);
  });

  it('rejects an invalid endpoint URL', () => {
    expect(
      serviceSpecificationSchema.safeParse({ name: 'Auth', endpoint: 'not-a-url' }).success,
    ).toBe(false);
  });

  it('accepts every valid httpMethod enum value', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    for (const m of methods) {
      expect(serviceSpecificationSchema.safeParse({ name: 'Auth', httpMethod: m }).success).toBe(
        true,
      );
    }
  });

  it('rejects an invalid httpMethod value', () => {
    expect(
      serviceSpecificationSchema.safeParse({ name: 'Auth', httpMethod: 'OPTIONS' }).success,
    ).toBe(false);
  });

  it('accepts every valid authType enum value', () => {
    const types = ['none', 'apiKey', 'bearer', 'oauth2', 'basic'];
    for (const t of types) {
      expect(serviceSpecificationSchema.safeParse({ name: 'Auth', authType: t }).success).toBe(
        true,
      );
    }
  });

  it('rejects an invalid authType value', () => {
    expect(serviceSpecificationSchema.safeParse({ name: 'Auth', authType: 'jwt' }).success).toBe(
      false,
    );
  });
});

describe('updateServiceSpecificationSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateServiceSpecificationSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------
describe('validForSchema', () => {
  it('accepts when only startDateTime is provided', () => {
    expect(validForSchema.safeParse({ startDateTime: '2024-01-01' }).success).toBe(true);
  });

  it('accepts when endDateTime is after startDateTime', () => {
    expect(
      validForSchema.safeParse({ startDateTime: '2024-01-01', endDateTime: '2024-12-31' }).success,
    ).toBe(true);
  });

  it('rejects when endDateTime is before startDateTime', () => {
    const result = validForSchema.safeParse({
      startDateTime: '2024-12-31',
      endDateTime: '2024-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when endDateTime equals startDateTime', () => {
    const result = validForSchema.safeParse({
      startDateTime: '2024-06-01',
      endDateTime: '2024-06-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('attachmentSchema', () => {
  it('accepts a valid attachment with URL', () => {
    expect(
      attachmentSchema.safeParse({ name: 'Doc', url: 'https://example.com/doc.pdf' }).success,
    ).toBe(true);
  });

  it('rejects an invalid URL', () => {
    expect(attachmentSchema.safeParse({ name: 'Doc', url: 'not-a-url' }).success).toBe(false);
  });

  it('rejects when name is empty', () => {
    expect(attachmentSchema.safeParse({ name: '', url: 'https://example.com' }).success).toBe(
      false,
    );
  });
});

describe('taxItemSchema', () => {
  it('accepts a valid tax rate', () => {
    expect(taxItemSchema.safeParse({ taxCategory: 'IVA', taxRate: 21 }).success).toBe(true);
  });

  it('rejects a negative tax rate', () => {
    expect(taxItemSchema.safeParse({ taxCategory: 'IVA', taxRate: -1 }).success).toBe(false);
  });

  it('rejects a tax rate above 100', () => {
    expect(taxItemSchema.safeParse({ taxCategory: 'IVA', taxRate: 101 }).success).toBe(false);
  });
});

describe('productOfferingTermSchema', () => {
  it('accepts a minimal payload without duration', () => {
    expect(productOfferingTermSchema.safeParse({ name: 'Anual' }).success).toBe(true);
  });

  it('accepts a valid duration', () => {
    expect(
      productOfferingTermSchema.safeParse({
        name: 'Anual',
        duration: { amount: 12, units: 'month' },
      }).success,
    ).toBe(true);
  });

  it('rejects a non-positive duration.amount', () => {
    expect(
      productOfferingTermSchema.safeParse({
        name: 'Anual',
        duration: { amount: 0, units: 'month' },
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid duration.units value', () => {
    expect(
      productOfferingTermSchema.safeParse({
        name: 'Anual',
        duration: { amount: 1, units: 'week' },
      }).success,
    ).toBe(false);
  });

  it('rejects when name is missing', () => {
    expect(productOfferingTermSchema.safeParse({}).success).toBe(false);
  });
});

describe('unitOfMeasureSchema', () => {
  it('accepts a valid payload', () => {
    expect(unitOfMeasureSchema.safeParse({ amount: 10, units: 'GB' }).success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    expect(unitOfMeasureSchema.safeParse({ amount: 0, units: 'GB' }).success).toBe(false);
  });

  it('rejects when units is missing', () => {
    expect(unitOfMeasureSchema.safeParse({ amount: 10 }).success).toBe(false);
  });

  it('rejects when units is empty', () => {
    expect(unitOfMeasureSchema.safeParse({ amount: 10, units: '' }).success).toBe(false);
  });
});

describe('optionalPercentageSchema', () => {
  it('preprocesses an empty string to undefined', () => {
    const result = optionalPercentageSchema.safeParse('');
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBeUndefined();
  });

  it('accepts the lower boundary (0)', () => {
    const result = optionalPercentageSchema.safeParse(0);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe(0);
  });

  it('accepts the upper boundary (100)', () => {
    const result = optionalPercentageSchema.safeParse(100);
    expect(result.success).toBe(true);
    expect(result.success && result.data).toBe(100);
  });

  it('rejects a value below 0', () => {
    expect(optionalPercentageSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects a value above 100', () => {
    expect(optionalPercentageSchema.safeParse(101).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// productOrderSchema  🔴 100%
// ---------------------------------------------------------------------------
describe('productOrderSchema', () => {
  it('accepts a minimal valid payload with default quantity', () => {
    const result = productOrderSchema.safeParse({ productOfferingId: 'urn:ngsi-ld:offering:1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.quantity).toBe(1);
  });

  it('rejects when productOfferingId is empty', () => {
    expect(productOrderSchema.safeParse({ productOfferingId: '' }).success).toBe(false);
  });

  it('rejects when productOfferingId is missing', () => {
    expect(productOrderSchema.safeParse({}).success).toBe(false);
  });

  it('rejects quantity: 0', () => {
    expect(
      productOrderSchema.safeParse({ productOfferingId: 'urn:ngsi-ld:offering:1', quantity: 0 })
        .success,
    ).toBe(false);
  });

  it('rejects quantity: -1', () => {
    expect(
      productOrderSchema.safeParse({ productOfferingId: 'urn:ngsi-ld:offering:1', quantity: -1 })
        .success,
    ).toBe(false);
  });
});

describe('orderDetailsSchema', () => {
  it('accepts an empty object (productOfferingId is omitted)', () => {
    expect(orderDetailsSchema.safeParse({}).success).toBe(true);
  });

  it('rejects quantity: 0', () => {
    expect(orderDetailsSchema.safeParse({ quantity: 0 }).success).toBe(false);
  });
});

describe('updateProductOrderSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateProductOrderSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// onboardingSchema
// ---------------------------------------------------------------------------
describe('onboardingSchema', () => {
  const valid = {
    organizationName: 'Empresa SL',
    country: 'ES',
    contactName: 'Ana García',
    contactEmail: 'ana@empresa.com',
    contactPhone: '+34 600 000 000',
    role: 'consumer' as const,
    acceptTerms: true,
    acceptPrivacy: true,
    acceptProcessing: true,
  };

  it('accepts a minimal valid payload', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when organizationName is empty', () => {
    expect(onboardingSchema.safeParse({ ...valid, organizationName: '' }).success).toBe(false);
  });

  it('rejects a personal email domain', () => {
    expect(onboardingSchema.safeParse({ ...valid, contactEmail: 'ana@gmail.com' }).success).toBe(
      false,
    );
  });

  it('accepts a corporate email domain', () => {
    expect(onboardingSchema.safeParse({ ...valid, contactEmail: 'ana@empresa.com' }).success).toBe(
      true,
    );
  });

  it('rejects an invalid role value', () => {
    expect(onboardingSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false);
  });

  it('rejects when acceptTerms is false', () => {
    expect(onboardingSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
  });

  it('rejects when country is empty', () => {
    expect(onboardingSchema.safeParse({ ...valid, country: '' }).success).toBe(false);
  });

  it('rejects when contactPhone is empty', () => {
    expect(onboardingSchema.safeParse({ ...valid, contactPhone: '' }).success).toBe(false);
  });

  it('accepts a valid bare-domain website', () => {
    expect(onboardingSchema.safeParse({ ...valid, website: 'ejemplo.com' }).success).toBe(true);
  });

  it('rejects a malformed website value', () => {
    expect(onboardingSchema.safeParse({ ...valid, website: 'not a domain!!' }).success).toBe(false);
  });

  it('accepts an empty website', () => {
    expect(onboardingSchema.safeParse({ ...valid, website: '' }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// individualProfileSchema
// ---------------------------------------------------------------------------
describe('individualProfileSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(
      individualProfileSchema.safeParse({ givenName: 'Ana', familyName: 'García' }).success,
    ).toBe(true);
  });

  it('rejects when givenName is empty', () => {
    expect(individualProfileSchema.safeParse({ givenName: '', familyName: 'García' }).success).toBe(
      false,
    );
  });

  it('rejects when familyName is empty', () => {
    expect(individualProfileSchema.safeParse({ givenName: 'Ana', familyName: '' }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// contractManagementSchema (organization.schema.ts)
// ---------------------------------------------------------------------------
describe('contractManagementSchema', () => {
  const valid = {
    address: 'https://contract.example.com/api',
    clientId: 'client-abc',
    scopes: 'read write',
  };

  it('accepts a valid payload', () => {
    expect(contractManagementSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed URL in address', () => {
    expect(contractManagementSchema.safeParse({ ...valid, address: 'not-a-url' }).success).toBe(
      false,
    );
  });

  it('rejects when clientId is empty', () => {
    expect(contractManagementSchema.safeParse({ ...valid, clientId: '' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stripeAccountSchema (organization.schema.ts)
// ---------------------------------------------------------------------------
describe('stripeAccountSchema', () => {
  it('accepts a well-formed acct_ id', () => {
    expect(
      stripeAccountSchema.safeParse({ stripeConnectAccountId: 'acct_1PxYzABCdef123' }).success,
    ).toBe(true);
  });

  it('rejects when the id is missing the acct_ prefix', () => {
    expect(
      stripeAccountSchema.safeParse({ stripeConnectAccountId: '1PxYzABCdef123' }).success,
    ).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(stripeAccountSchema.safeParse({ stripeConnectAccountId: '' }).success).toBe(false);
  });

  it('rejects when the field is missing', () => {
    expect(stripeAccountSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fiscalDataSchema (organization.schema.ts)
// ---------------------------------------------------------------------------
describe('fiscalDataSchema', () => {
  const valid = {
    name: 'Acme Telecom S.L.',
    taxId: 'B12345678',
    street1: 'Calle Mayor, 1',
    city: 'Madrid',
    postCode: '28001',
    country: 'España',
  };

  it('accepts a valid payload', () => {
    expect(fiscalDataSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when name is empty', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects a malformed CIF', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, taxId: '12345678' }).success).toBe(false);
  });

  it('rejects an empty CIF', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, taxId: '' }).success).toBe(false);
  });

  it('rejects when street1 is empty', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, street1: '' }).success).toBe(false);
  });

  it('rejects when city is empty', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, city: '' }).success).toBe(false);
  });

  it('rejects when postCode is empty', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, postCode: '' }).success).toBe(false);
  });

  it('rejects when country is empty', () => {
    expect(fiscalDataSchema.safeParse({ ...valid, country: '' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// agreementTermsSchema
// ---------------------------------------------------------------------------
describe('agreementTermsSchema', () => {
  it('accepts an empty object and applies defaults', () => {
    const result = agreementTermsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purpose).toBe('commercial');
      expect(result.data.canRedistribute).toBe(false);
      expect(result.data.requiresAttribution).toBe(true);
    }
  });

  it('accepts a valid purpose enum value', () => {
    expect(agreementTermsSchema.safeParse({ purpose: 'research' }).success).toBe(true);
  });

  it('rejects an invalid purpose value', () => {
    expect(agreementTermsSchema.safeParse({ purpose: 'informal' }).success).toBe(false);
  });

  it('rejects customTerms with an empty description', () => {
    expect(agreementTermsSchema.safeParse({ customTerms: [{ description: '' }] }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// emailSchema / corporateEmailSchema / emailWithConsentSchema
// ---------------------------------------------------------------------------
describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(emailSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('corporateEmailSchema', () => {
  it('accepts a corporate email', () => {
    expect(corporateEmailSchema.safeParse({ email: 'user@empresa.com' }).success).toBe(true);
  });

  it('rejects a personal email domain', () => {
    expect(corporateEmailSchema.safeParse({ email: 'user@gmail.com' }).success).toBe(false);
  });
});

describe('emailWithConsentSchema', () => {
  it('accepts a valid payload with consent', () => {
    expect(
      emailWithConsentSchema.safeParse({ email: 'user@example.com', acceptTerms: true }).success,
    ).toBe(true);
  });

  it('rejects when acceptTerms is false', () => {
    expect(
      emailWithConsentSchema.safeParse({ email: 'user@example.com', acceptTerms: false }).success,
    ).toBe(false);
  });
});

describe('reviewCommentSchema', () => {
  it('accepts a valid payload with rating and body', () => {
    expect(reviewCommentSchema.safeParse({ rating: 5, body: 'Excelente producto' }).success).toBe(
      true,
    );
  });

  it('accepts a valid payload without body (optional)', () => {
    expect(reviewCommentSchema.safeParse({ rating: 3 }).success).toBe(true);
  });

  it('rejects a rating of 0', () => {
    expect(reviewCommentSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it('rejects a rating above 5', () => {
    expect(reviewCommentSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it('rejects a non-integer rating', () => {
    expect(reviewCommentSchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });

  it('rejects a body longer than 1000 characters', () => {
    expect(reviewCommentSchema.safeParse({ rating: 4, body: 'a'.repeat(1001) }).success).toBe(
      false,
    );
  });

  it('accepts a body of exactly 1000 characters', () => {
    expect(reviewCommentSchema.safeParse({ rating: 4, body: 'a'.repeat(1000) }).success).toBe(true);
  });
});
