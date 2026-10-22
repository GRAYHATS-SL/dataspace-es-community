/** Marketplace fee percentage withheld on each sale (application_fee_amount). */
export function getMarketplaceFeePercent(): number {
  const value = Number(process.env.MARKETPLACE_FEE_PERCENT);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
