import posthog, { type Properties } from "posthog-js";
import type { Router } from "vue-router";
import { useCookieConsent } from "./useCookieConsent";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const POSTHOG_ENABLED =
  import.meta.env.VITE_POSTHOG_ENABLED === "true" ||
  import.meta.env.VITE_POSTHOG_ENABLED === "1";

const isBrowser = typeof window !== "undefined";
const isTest =
  import.meta.env.MODE === "test" ||
  import.meta.env.MODE === "vitest" ||
  import.meta.env.VITEST;

let isInitialized = false;
let pageviewTrackingAttached = false;
let activeRouter: Router | undefined;

function isEnabled() {
  return isBrowser && !isTest && POSTHOG_ENABLED && !!POSTHOG_KEY;
}

function initializePosthog(): void {
  if (!isEnabled() || isInitialized) return;

  const config: Parameters<typeof posthog.init>[1] = {
    capture_pageview: false,
  };

  if (POSTHOG_HOST) {
    config.api_host = POSTHOG_HOST;
  }

  if (import.meta.env.DEV) {
    config.debug = true;
  }

  posthog.init(POSTHOG_KEY as string, config);

  if (activeRouter && !pageviewTrackingAttached) {
    activeRouter.afterEach(() => {
      if (!posthog.has_opted_in_capturing()) return;
      posthog.capture("$pageview");
    });
    pageviewTrackingAttached = true;
  }

  isInitialized = true;
}

export function initPosthog(router?: Router) {
  if (router) {
    activeRouter = router;
  }

  const { consent, initCookieConsent } = useCookieConsent();
  initCookieConsent();

  if (!consent.value?.marketing) return;

  initializePosthog();
  posthog.opt_in_capturing({ captureEventName: false });
}

export function syncPosthogConsent(marketingEnabled: boolean): void {
  if (!isEnabled()) return;

  if (marketingEnabled) {
    initializePosthog();
    if (!isInitialized) return;
    posthog.opt_in_capturing({ captureEventName: false });
    return;
  }

  if (!isInitialized) return;
  posthog.opt_out_capturing();
}

export function usePosthog() {
  return {
    isEnabled: isEnabled(),
    capture: (event: string, properties?: Properties) => {
      if (!isEnabled()) return;
      posthog.capture(event, properties);
    },
    identify: (distinctId: string, properties?: Properties) => {
      if (!isEnabled()) return;
      posthog.identify(distinctId, properties);
    },
    reset: () => {
      if (!isEnabled()) return;
      posthog.reset();
    },
    posthog,
  };
}
