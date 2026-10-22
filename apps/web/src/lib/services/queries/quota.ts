'use server';

import { fetchProviderQuota } from '@/lib/services/quotaClient';
import { MARKETPLACE_DID } from '@/lib/services/verifier.constants';
import { getSpecProviderId, isOrganizationActive } from '@/lib/utils/organizationStatus';
import { getLatestCharacteristicValue } from '@/lib/utils/partyCharacteristic';
import {
  getQuotaOfferTerms,
  interpretQuota,
  type ProviderEndpoints,
  type QuotaOfferTerms,
  type QuotaView,
  readContractAddress,
  readOrganizationDid,
  resolveProviderEndpoints,
} from '@/lib/utils/quota';
import type {
  Organization,
  ProductOffering,
  ProductOrder,
  ProductSpecification,
} from '@/types/api';

import { getCurrentUserOrganizationId, requireRole } from './_utils';
import { getOwnedOfferings } from './ownership';
import { fetchOrganizationById, fetchOrganizations } from './party';
import { fetchProductOfferingById } from './productOffering';
import { fetchProductOrdersAsBuyer } from './productOrder';
import { getProductSpecificationById } from './productSpecification';

/** Query result: the interpreted view or a sanitized error message. */
export type QuotaOutcome = { view: QuotaView } | { error: string };

export interface BuyerQuotaEntry {
  offeringId: string;
  offeringName: string;
  providerName: string;
  terms: QuotaOfferTerms;
  /** `completed` orders of this offering (grant access). */
  completedOrders: number;
  /** `cancelled` orders of this offering (cut access, purchased amount still counts). */
  cancelledOrders: number;
  outcome: QuotaOutcome;
}

export interface ProviderQuotaEntry {
  offeringId: string;
  offeringName: string;
  consumerName: string;
  consumerDid: string;
  terms: QuotaOfferTerms;
  view: QuotaView;
}

export interface ProviderQuotaSweep {
  /** Only combinations with an applied purchase. */
  entries: ProviderQuotaEntry[];
  /** Distinct error messages; empty if there were no failures. */
  errors: string[];
  /** Queries performed (consumers × metered offerings). */
  scanned: number;
  /** `true` if the sweep was truncated by `MAX_SWEEP_PAIRS`. */
  truncated: boolean;
}

const MAX_SWEEP_PAIRS = 100;
const SWEEP_CONCURRENCY = 5;

const GENERIC_ERROR = 'No se pudo consultar el consumo.';

// Errors from the `/quota` client only carry a step and status or their own Spanish messages, never credentials or remote bodies; the length is still capped before sending them to the browser.
const toErrorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message.slice(0, 200) : GENERIC_ERROR;

async function resolveEndpoints(org: Organization): Promise<ProviderEndpoints> {
  const did = readOrganizationDid(getLatestCharacteristicValue(org.partyCharacteristic, 'did'));
  const address = readContractAddress(
    getLatestCharacteristicValue(org.partyCharacteristic, 'contractManagement'),
  );
  if (!did) throw new Error('El provider no tiene DID en su ficha.');
  if (!address) throw new Error('El provider no tiene dirección de contract management.');
  return resolveProviderEndpoints(address, did);
}

async function queryQuota(
  org: Organization,
  consumerDid: string,
  terms: QuotaOfferTerms,
): Promise<QuotaOutcome> {
  try {
    const endpoints = await resolveEndpoints(org);
    const quota = await fetchProviderQuota({ endpoints, consumerDid, offerId: terms.offerId });
    return { view: interpretQuota(quota, terms) };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

async function mapInBatches<T, R>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

interface MeteredOffering {
  offering: ProductOffering;
  spec: ProductSpecification;
  terms: QuotaOfferTerms;
}

async function loadMeteredOffering(offeringId: string): Promise<MeteredOffering | undefined> {
  const offering = await fetchProductOfferingById(offeringId);
  const specId = offering.productSpecification?.id;
  if (!specId) return undefined;
  const spec = await getProductSpecificationById(specId);
  const terms = getQuotaOfferTerms(spec);
  return terms ? { offering, spec, terms } : undefined;
}

const COUNTED_STATES: ReadonlySet<ProductOrder['state']> = new Set(['completed', 'cancelled']);

interface OrderCounts {
  completed: number;
  cancelled: number;
}

const offeringIdsOf = (order: ProductOrder): string[] =>
  (order.productOrderItem ?? []).flatMap((i) =>
    i.productOffering?.id ? [i.productOffering.id] : [],
  );

/** Counts `completed`/`cancelled` orders per offering. */
const countOrdersByOffering = (orders: readonly ProductOrder[]): Map<string, OrderCounts> => {
  const byOffering = new Map<string, OrderCounts>();
  for (const order of orders.filter((o) => COUNTED_STATES.has(o.state))) {
    for (const offeringId of offeringIdsOf(order)) {
      const counts = byOffering.get(offeringId) ?? { completed: 0, cancelled: 0 };
      if (order.state === 'completed') counts.completed += 1;
      else counts.cancelled += 1;
      byOffering.set(offeringId, counts);
    }
  }
  return byOffering;
};

/** Reads each provider once per query; `undefined` if unreadable. */
const createProviderLoader = () => {
  const cache = new Map<string, Promise<Organization | undefined>>();
  return (providerId: string) => {
    const cached = cache.get(providerId);
    if (cached) return cached;
    const pending = fetchOrganizationById(providerId).catch(() => undefined);
    cache.set(providerId, pending);
    return pending;
  };
};

/**
 * @summary Gets the metered offerings my organization has bought, with their usage.
 *
 * @returns {Promise<BuyerQuotaEntry[]>} One entry per metered offering bought.
 * @throws {Error} `Forbidden` without BUYER/ADMIN role; error if my organization has no DID.
 */
export async function fetchMyQuotas(): Promise<BuyerQuotaEntry[]> {
  await requireRole('BUYER');
  const orgId = await getCurrentUserOrganizationId();
  const [myOrg, orders] = await Promise.all([
    fetchOrganizationById(orgId),
    fetchProductOrdersAsBuyer(),
  ]);
  const consumerDid = readOrganizationDid(
    getLatestCharacteristicValue(myOrg.partyCharacteristic, 'did'),
  );
  if (!consumerDid) throw new Error('Tu organización no tiene DID en su ficha.');

  const countsByOffering = countOrdersByOffering(orders);
  const loaded = await Promise.all(
    [...countsByOffering.keys()].map(async (offeringId) => ({
      offeringId,
      metered: await loadMeteredOffering(offeringId).catch(() => undefined),
    })),
  );

  const getProvider = createProviderLoader();
  const buildEntry = async (
    offeringId: string,
    metered: MeteredOffering,
  ): Promise<BuyerQuotaEntry> => {
    const providerId = getSpecProviderId(metered.spec);
    const provider = providerId ? await getProvider(providerId) : undefined;
    const counts = countsByOffering.get(offeringId);
    const base = {
      offeringId,
      offeringName: metered.offering.name ?? offeringId,
      providerName: provider?.name ?? providerId ?? '—',
      terms: metered.terms,
      completedOrders: counts?.completed ?? 0,
      cancelledOrders: counts?.cancelled ?? 0,
    };
    if (!provider) return { ...base, outcome: { error: 'No se pudo leer el provider.' } };
    return { ...base, outcome: await queryQuota(provider, consumerDid, metered.terms) };
  };

  return Promise.all(
    loaded.flatMap(({ offeringId, metered }) => (metered ? [buildEntry(offeringId, metered)] : [])),
  );
}

/**
 * @summary Gets usage of my metered offerings by consumers (provisional sweep).
 *
 * @returns {Promise<ProviderQuotaSweep>} Entries with an applied purchase plus sweep data.
 * @throws {Error} `Forbidden` without SELLER/ADMIN role.
 */
export async function fetchProviderQuotas(): Promise<ProviderQuotaSweep> {
  await requireRole('SELLER');
  const orgId = await getCurrentUserOrganizationId();
  const [myOrg, ownedOfferings, organizations] = await Promise.all([
    fetchOrganizationById(orgId),
    getOwnedOfferings(orgId),
    fetchOrganizations(),
  ]);

  const specIds = [
    ...new Set(
      ownedOfferings.flatMap((o) =>
        o.productSpecification?.id ? [o.productSpecification.id] : [],
      ),
    ),
  ];
  const specs = new Map(
    (await Promise.all(specIds.map((id) => getProductSpecificationById(id).catch(() => undefined))))
      .filter((s): s is ProductSpecification => !!s?.id)
      .map((s) => [s.id as string, s]),
  );
  const metered = ownedOfferings.flatMap((offering) => {
    const spec = offering.productSpecification?.id
      ? specs.get(offering.productSpecification.id)
      : undefined;
    const terms = getQuotaOfferTerms(spec);
    // Without limits there is no purchase to detect with `cap`.
    return terms && (terms.bytesLimit !== undefined || terms.requestsLimit !== undefined)
      ? [{ offering, terms }]
      : [];
  });

  const consumers = organizations.flatMap((org) => {
    const did = readOrganizationDid(getLatestCharacteristicValue(org.partyCharacteristic, 'did'));
    return did && org.id !== orgId && did !== MARKETPLACE_DID && isOrganizationActive(org)
      ? [{ org, did }]
      : [];
  });

  const pairs = metered.flatMap((m) => consumers.map((c) => ({ ...m, consumer: c })));
  const truncated = pairs.length > MAX_SWEEP_PAIRS;
  const selected = pairs.slice(0, MAX_SWEEP_PAIRS);

  const results = await mapInBatches(selected, SWEEP_CONCURRENCY, async (pair) => ({
    pair,
    outcome: await queryQuota(myOrg, pair.consumer.did, pair.terms),
  }));

  const entries: ProviderQuotaEntry[] = [];
  const errors = new Set<string>();
  for (const { pair, outcome } of results) {
    if ('error' in outcome) errors.add(outcome.error);
    else if (outcome.view.status !== 'not-activated') {
      entries.push({
        offeringId: pair.offering.id ?? pair.terms.offerId,
        offeringName: pair.offering.name ?? pair.terms.offerId,
        consumerName: pair.consumer.org.name ?? pair.consumer.org.id,
        consumerDid: pair.consumer.did,
        terms: pair.terms,
        view: outcome.view,
      });
    }
  }
  return { entries, errors: [...errors], scanned: selected.length, truncated };
}
