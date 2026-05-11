import { computed, ref } from "vue";

export interface CookieConsentPreferences {
  marketing: boolean;
}

interface StoredCookieConsent extends CookieConsentPreferences {
  version: number;
  updatedAt: string;
}

interface StoredCookieBannerState {
  version: number;
  dismissed: boolean;
  updatedAt: string;
}

const COOKIE_CONSENT_STORAGE_KEY = "me3-cookie-consent";
const COOKIE_BANNER_STATE_STORAGE_KEY = "me3-cookie-banner-state";
const COOKIE_CONSENT_VERSION = 1;

const consent = ref<CookieConsentPreferences | null>(null);
const dismissed = ref(false);
const initialized = ref(false);

function isStoredCookieConsent(
  value: unknown,
): value is StoredCookieConsent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCookieConsent>;
  return (
    candidate.version === COOKIE_CONSENT_VERSION &&
    typeof candidate.marketing === "boolean"
  );
}

function isStoredCookieBannerState(
  value: unknown,
): value is StoredCookieBannerState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCookieBannerState>;
  return (
    candidate.version === COOKIE_CONSENT_VERSION &&
    typeof candidate.dismissed === "boolean"
  );
}

function readStoredConsent(): CookieConsentPreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isStoredCookieConsent(parsedValue)) {
      window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
      return null;
    }

    return {
      marketing: parsedValue.marketing,
    };
  } catch {
    return null;
  }
}

function writeStoredConsent(nextConsent: CookieConsentPreferences): void {
  if (typeof window === "undefined") return;

  try {
    const storedConsent: StoredCookieConsent = {
      ...nextConsent,
      version: COOKIE_CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(storedConsent),
    );
  } catch {
    // Ignore storage failures so the banner still works for the current session.
  }
}

function readStoredBannerDismissedState(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const rawValue = window.localStorage.getItem(COOKIE_BANNER_STATE_STORAGE_KEY);
    if (!rawValue) return false;

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isStoredCookieBannerState(parsedValue)) {
      window.localStorage.removeItem(COOKIE_BANNER_STATE_STORAGE_KEY);
      return false;
    }

    return parsedValue.dismissed;
  } catch {
    return false;
  }
}

function writeStoredBannerDismissedState(nextDismissed: boolean): void {
  if (typeof window === "undefined") return;

  try {
    const storedState: StoredCookieBannerState = {
      version: COOKIE_CONSENT_VERSION,
      dismissed: nextDismissed,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      COOKIE_BANNER_STATE_STORAGE_KEY,
      JSON.stringify(storedState),
    );
  } catch {
    // Ignore storage failures so the banner still works for the current session.
  }
}

function initCookieConsent(): void {
  if (initialized.value) return;
  consent.value = readStoredConsent();
  dismissed.value = readStoredBannerDismissedState();
  initialized.value = true;
}

function setConsent(nextConsent: CookieConsentPreferences): void {
  consent.value = {
    marketing: nextConsent.marketing,
  };
  dismissed.value = false;
  writeStoredConsent(consent.value);
  writeStoredBannerDismissedState(false);
  initialized.value = true;
}

function acceptAll(): void {
  setConsent({ marketing: true });
}

function rejectNonEssential(): void {
  setConsent({ marketing: false });
}

function dismissBanner(): void {
  dismissed.value = true;
  writeStoredBannerDismissedState(true);
  initialized.value = true;
}

export function useCookieConsent() {
  return {
    consent,
    shouldShowBanner: computed(
      () => initialized.value && consent.value === null && !dismissed.value,
    ),
    initCookieConsent,
    setConsent,
    acceptAll,
    rejectNonEssential,
    dismissBanner,
  };
}
