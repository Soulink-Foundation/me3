import { describe, expect, it } from "vitest";
import { resolvePricingCheckoutIntent } from "./pricing-checkout";

describe("resolvePricingCheckoutIntent", () => {
  it("returns null when checkout is missing or invalid", () => {
    expect(resolvePricingCheckoutIntent(undefined, undefined)).toBeNull();
    expect(resolvePricingCheckoutIntent("free", "month")).toBeNull();
  });

  it("defaults the interval to month", () => {
    expect(resolvePricingCheckoutIntent("starter", undefined)).toEqual({
      tier: "starter",
      interval: "month",
    });
    expect(resolvePricingCheckoutIntent("pro", undefined)).toEqual({
      tier: "pro",
      interval: "month",
    });
  });

  it("accepts a yearly interval when present", () => {
    expect(resolvePricingCheckoutIntent("pro", "year")).toEqual({
      tier: "pro",
      interval: "year",
    });
  });
});
