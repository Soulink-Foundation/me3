export const DEFAULT_AGENT_LOCALE = "en-US";

export type AgentLocaleOption = {
  value: string;
  label: string;
};

export const AGENT_LOCALE_OPTIONS: readonly AgentLocaleOption[] = [
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-NZ", label: "English (New Zealand)" },
  { value: "en-IN", label: "English (India)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "fr-CA", label: "French (Canada)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "es-MX", label: "Spanish (Mexico)" },
  { value: "it-IT", label: "Italian (Italy)" },
  { value: "nl-NL", label: "Dutch (Netherlands)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
  { value: "pt-PT", label: "Portuguese (Portugal)" },
  { value: "ja-JP", label: "Japanese (Japan)" },
  { value: "ko-KR", label: "Korean (South Korea)" },
  { value: "zh-CN", label: "Chinese (China)" },
  { value: "zh-TW", label: "Chinese (Taiwan)" },
] as const;

const LOCALE_LABELS = new Map(
  AGENT_LOCALE_OPTIONS.map((option) => [option.value, option.label] as const),
);

const TIMEZONE_EXACT_LOCALES: Record<string, string> = {
  "America/Montreal": "fr-CA",
  "Asia/Calcutta": "en-IN",
  "Asia/Hong_Kong": "zh-TW",
  "Asia/Kolkata": "en-IN",
  "Asia/Seoul": "ko-KR",
  "Asia/Shanghai": "zh-CN",
  "Asia/Taipei": "zh-TW",
  "Asia/Tokyo": "ja-JP",
  "Australia/Adelaide": "en-AU",
  "Australia/Brisbane": "en-AU",
  "Australia/Darwin": "en-AU",
  "Australia/Hobart": "en-AU",
  "Australia/Melbourne": "en-AU",
  "Australia/Perth": "en-AU",
  "Australia/Sydney": "en-AU",
  "Europe/Amsterdam": "nl-NL",
  "Europe/Berlin": "de-DE",
  "Europe/Brussels": "fr-FR",
  "Europe/Copenhagen": "da-DK",
  "Europe/Dublin": "en-GB",
  "Europe/Helsinki": "fi-FI",
  "Europe/Lisbon": "pt-PT",
  "Europe/London": "en-GB",
  "Europe/Madrid": "es-ES",
  "Europe/Oslo": "nb-NO",
  "Europe/Paris": "fr-FR",
  "Europe/Rome": "it-IT",
  "Europe/Stockholm": "sv-SE",
  "Europe/Vienna": "de-DE",
  "Europe/Zurich": "de-DE",
  "Pacific/Auckland": "en-NZ",
  "Pacific/Chatham": "en-NZ",
  "Pacific/Honolulu": "en-US",
};

const TIMEZONE_PREFIX_LOCALES: ReadonlyArray<[prefix: string, locale: string]> = [
  ["America/Argentina/", "es-ES"],
  ["America/Mexico_", "es-MX"],
  ["America/North_Dakota/", "en-US"],
  ["America/Sao_Paulo", "pt-BR"],
  ["America/Toronto", "en-CA"],
  ["America/Vancouver", "en-CA"],
  ["America/Winnipeg", "en-CA"],
  ["America/Whitehorse", "en-CA"],
  ["America/Yellowknife", "en-CA"],
  ["Australia/", "en-AU"],
];

function getDisplayName(type: "language" | "region", value: string): string | null {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type });
    return displayNames.of(value) || null;
  } catch {
    return null;
  }
}

export function normalizeLocale(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return Intl.getCanonicalLocales(trimmed)[0] || null;
  } catch {
    return null;
  }
}

export function inferLocaleFromTimeZone(timeZone: unknown): string {
  const normalizedTimeZone =
    typeof timeZone === "string" ? timeZone.trim() : "";
  if (!normalizedTimeZone) return DEFAULT_AGENT_LOCALE;

  const exact = TIMEZONE_EXACT_LOCALES[normalizedTimeZone];
  if (exact) return exact;

  const prefixMatch = TIMEZONE_PREFIX_LOCALES.find(([prefix]) =>
    normalizedTimeZone.startsWith(prefix),
  );
  if (prefixMatch) return prefixMatch[1];

  return DEFAULT_AGENT_LOCALE;
}

export function resolveAgentLocale(locale: unknown, timeZone: unknown): string {
  return normalizeLocale(locale) || inferLocaleFromTimeZone(timeZone);
}

export function getAgentLocaleDisplayLabel(locale: string): string {
  const normalized = normalizeLocale(locale) || locale.trim();
  const known = LOCALE_LABELS.get(normalized);
  if (known) return known;

  const [languageCode, regionCode] = normalized.split("-");
  const language = getDisplayName("language", languageCode) || languageCode;
  const region = regionCode
    ? getDisplayName("region", regionCode.toUpperCase()) || regionCode.toUpperCase()
    : null;

  return region ? `${language} (${region})` : language;
}
