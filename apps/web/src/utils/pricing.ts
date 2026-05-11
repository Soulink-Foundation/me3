/**
 * Centralized pricing configuration for me3 subscription tiers
 */

import {
  getTierCapabilities,
  type SubscriptionTier,
} from "../../../../shared/tier-capabilities";

export type { SubscriptionTier };
export type BillingInterval = "month" | "year";
export type PaidTier = Exclude<SubscriptionTier, "free">;

export interface TierConfig {
  name: string;
  yearly: number;
  monthly: number;
  features: string[];
  overageRate?: number; // $ per 1,000 emails
}

export const PRICING_TIERS: Record<PaidTier, TierConfig> = {
  starter: {
    name: "Starter",
    yearly: 89,
    monthly: 9,
    features: [
      "1 ME3 site with hosting and custom domain",
      "Accept bookings from your site",
      "Collect newsletter subscribers",
    ],
  },
  pro: {
    name: "Pro",
    yearly: 290,
    monthly: 29,
    overageRate: 2,
    features: [
      "ME3 AI Assistant to manage business tasks",
      "Send 5,000 emails/month (Overages at $2 per 1,000 emails)",
      "Accept paid Bookings",
      "1 ME3 site plus up to 3 landing pages",
      "Custom domains",
      "Custom email",
      "Manage social media content",
    ],
  },
};

/**
 * Get pricing for a specific tier and interval
 */
export function getPrice(tier: PaidTier, interval: BillingInterval): number {
  const config = PRICING_TIERS[tier];
  return interval === "year" ? config.yearly : config.monthly;
}

/**
 * Calculate savings percentage for yearly billing
 */
export function getYearlySavings(tier: PaidTier): number {
  const config = PRICING_TIERS[tier];
  const monthlyAnnual = config.monthly * 12;
  const savings = ((monthlyAnnual - config.yearly) / monthlyAnnual) * 100;
  return Math.round(savings);
}

/**
 * Get email quota for a tier
 */
export function getEmailQuota(tier: SubscriptionTier): number {
  return getTierCapabilities(tier).emailSendQuota;
}

/**
 * Get max sites for a tier
 */
export function getMaxSites(tier: SubscriptionTier): number {
  return getTierCapabilities(tier).maxSites;
}

/**
 * Check if a tier has a specific feature
 */
export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
  if (tier === "free") return false;
  return PRICING_TIERS[tier].features.some((f) =>
    f.toLowerCase().includes(feature.toLowerCase()),
  );
}
