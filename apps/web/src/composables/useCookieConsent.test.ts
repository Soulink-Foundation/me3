import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useCookieConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("shows the banner until a preference is stored", async () => {
    const { useCookieConsent } = await import("./useCookieConsent");
    const { consent, shouldShowBanner, initCookieConsent } = useCookieConsent();

    initCookieConsent();

    expect(consent.value).toBeNull();
    expect(shouldShowBanner.value).toBe(true);
  });

  it("persists accepted marketing preferences", async () => {
    const { useCookieConsent } = await import("./useCookieConsent");
    const { acceptAll, consent, initCookieConsent, shouldShowBanner } =
      useCookieConsent();

    initCookieConsent();
    acceptAll();

    expect(consent.value).toEqual({ marketing: true });
    expect(shouldShowBanner.value).toBe(false);

    const storedValue = window.localStorage.getItem("me3-cookie-consent");
    expect(storedValue).not.toBeNull();
    expect(JSON.parse(storedValue as string)).toMatchObject({
      version: 1,
      marketing: true,
    });
  });

  it("hydrates saved preferences", async () => {
    window.localStorage.setItem(
      "me3-cookie-consent",
      JSON.stringify({
        version: 1,
        marketing: false,
        updatedAt: "2026-04-14T10:00:00.000Z",
      }),
    );

    const { useCookieConsent } = await import("./useCookieConsent");
    const { consent, initCookieConsent, shouldShowBanner } = useCookieConsent();

    initCookieConsent();

    expect(consent.value).toEqual({ marketing: false });
    expect(shouldShowBanner.value).toBe(false);
  });

  it("persists banner dismissal", async () => {
    const { useCookieConsent } = await import("./useCookieConsent");
    const { dismissBanner, initCookieConsent, shouldShowBanner } =
      useCookieConsent();

    initCookieConsent();
    dismissBanner();

    expect(shouldShowBanner.value).toBe(false);

    const storedValue = window.localStorage.getItem("me3-cookie-banner-state");
    expect(storedValue).not.toBeNull();
    expect(JSON.parse(storedValue as string)).toMatchObject({
      version: 1,
      dismissed: true,
    });
  });

  it("hydrates saved banner dismissal", async () => {
    window.localStorage.setItem(
      "me3-cookie-banner-state",
      JSON.stringify({
        version: 1,
        dismissed: true,
        updatedAt: "2026-04-14T10:00:00.000Z",
      }),
    );

    const { useCookieConsent } = await import("./useCookieConsent");
    const { initCookieConsent, shouldShowBanner } = useCookieConsent();

    initCookieConsent();

    expect(shouldShowBanner.value).toBe(false);
  });
});
