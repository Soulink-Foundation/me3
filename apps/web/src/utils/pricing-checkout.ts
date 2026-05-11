import type { BillingInterval, PaidTier } from "./pricing";

export type PricingCheckoutIntent = {
  tier: PaidTier;
  interval: BillingInterval;
};

function parsePaidTier(value: unknown): PaidTier | null {
  if (value === "starter") return "starter";
  if (value === "pro") return "pro";
  return null;
}

function parseBillingInterval(value: unknown): BillingInterval {
  return value === "year" ? "year" : "month";
}

export function resolvePricingCheckoutIntent(
  checkout: unknown,
  interval: unknown,
): PricingCheckoutIntent | null {
  const tier = parsePaidTier(checkout);
  if (!tier) return null;

  return {
    tier,
    interval: parseBillingInterval(interval),
  };
}
