/**
 * Optional per-product purchase confirmation email (creator-authored).
 * No generic sends: both subject and message must be non-empty when enabled.
 */

export type ProductPurchaseConfirmationEmail = {
  enabled?: boolean;
  subject?: string;
  message?: string;
};

export function productSendsPurchaseConfirmation(
  config: ProductPurchaseConfirmationEmail | undefined,
): config is ProductPurchaseConfirmationEmail & {
  subject: string;
  message: string;
} {
  if (!config || config.enabled !== true) return false;
  const subject =
    typeof config.subject === "string" ? config.subject.trim() : "";
  const message =
    typeof config.message === "string" ? config.message.trim() : "";
  return subject.length > 0 && message.length > 0;
}

export type PurchaseEmailTokenContext = {
  buyerName: string;
  buyerNote: string;
  productTitle: string;
  siteName: string;
  supportEmail: string;
};

const TOKEN_ORDER: Array<{
  key: keyof PurchaseEmailTokenContext;
  token: string;
}> = [
  { key: "buyerName", token: "buyerName" },
  { key: "buyerNote", token: "buyerNote" },
  { key: "productTitle", token: "productTitle" },
  { key: "siteName", token: "siteName" },
  { key: "supportEmail", token: "supportEmail" },
];

export function applyPurchaseEmailTokens(
  template: string,
  ctx: PurchaseEmailTokenContext,
): string {
  let out = template;
  for (const { key, token } of TOKEN_ORDER) {
    const value = ctx[key] ?? "";
    out = out.replace(new RegExp(`{{\\s*${token}\\s*}}`, "g"), value);
  }
  return out;
}
