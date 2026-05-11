<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Button from "./Button.vue";
import { useCookieConsent } from "../composables/useCookieConsent";

const HOMEPAGE_REVEAL_SCROLL_Y = 140;

const {
  consent,
  shouldShowBanner,
  acceptAll,
  rejectNonEssential,
  setConsent,
  dismissBanner: persistBannerDismissal,
} = useCookieConsent();

const route = useRoute();
const showPreferences = ref(false);
const bannerRevealed = ref(false);
const marketingEnabled = ref(consent.value?.marketing ?? false);
const showBanner = computed(
  () => shouldShowBanner.value && bannerRevealed.value,
);

watch(
  consent,
  (value) => {
    marketingEnabled.value = value?.marketing ?? false;

    if (value) {
      showPreferences.value = false;
    }
  },
  { immediate: true },
);

function handleAcceptAll(): void {
  marketingEnabled.value = true;
  acceptAll();
}

function handleReject(): void {
  marketingEnabled.value = false;
  rejectNonEssential();
}

function handleSavePreferences(): void {
  setConsent({
    marketing: marketingEnabled.value,
  });
}

function togglePreferences(): void {
  showPreferences.value = !showPreferences.value;
}

function dismissBanner(): void {
  persistBannerDismissal();
  showPreferences.value = false;
}

function revealBanner(): void {
  bannerRevealed.value = true;
  detachScrollListener();
}

function handleHomepageScroll(): void {
  if (window.scrollY >= HOMEPAGE_REVEAL_SCROLL_Y) {
    revealBanner();
  }
}

function attachScrollListener(): void {
  window.addEventListener("scroll", handleHomepageScroll, { passive: true });
}

function detachScrollListener(): void {
  window.removeEventListener("scroll", handleHomepageScroll);
}

function syncBannerReveal(): void {
  if (typeof window === "undefined") return;

  if (!shouldShowBanner.value) {
    detachScrollListener();
    return;
  }

  if (bannerRevealed.value) return;

  if (route.path !== "/") {
    revealBanner();
    return;
  }

  if (window.scrollY >= HOMEPAGE_REVEAL_SCROLL_Y) {
    revealBanner();
    return;
  }

  attachScrollListener();
}

watch([() => route.path, shouldShowBanner], () => {
  syncBannerReveal();
});

onMounted(() => {
  syncBannerReveal();
});

onBeforeUnmount(() => {
  detachScrollListener();
});
</script>

<template>
  <Transition name="cookie-consent">
    <section
      v-if="showBanner"
      class="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <button
        type="button"
        class="cookie-banner__dismiss"
        aria-label="Dismiss cookie banner"
        @click="dismissBanner"
      >
        <span aria-hidden="true">×</span>
      </button>

      <div class="cookie-banner__body">
        <p class="cookie-banner__eyebrow">Cookies & privacy</p>
        <p class="cookie-banner__text">
          We use essential cookies to keep me3 running.
        </p>
      </div>

      <div v-if="showPreferences" class="cookie-banner__preferences">
        <div class="cookie-banner__row">
          <div class="cookie-banner__copy">
            <p id="cookie-marketing-title" class="cookie-banner__pref-title">
              Marketing cookies
            </p>
            <p
              id="cookie-marketing-description"
              class="cookie-banner__pref-description"
            >
              Allow analytics cookies to help us understand which parts of me3
              are useful.
            </p>
          </div>

          <label class="cookie-toggle">
            <span class="sr-only">Enable marketing cookies</span>
            <input
              v-model="marketingEnabled"
              class="cookie-toggle__input"
              type="checkbox"
              aria-labelledby="cookie-marketing-title"
              aria-describedby="cookie-marketing-description"
            />
            <span class="cookie-toggle__track" aria-hidden="true"></span>
          </label>
        </div>

        <Button
          class="cookie-banner__save cookie-banner__button cookie-banner__button--primary"
          size="small"
          variant="primary"
          @click="handleSavePreferences"
        >
          Save preferences
        </Button>
      </div>

      <div class="cookie-banner__actions">
        <Button
          class="cookie-banner__button cookie-banner__button--primary"
          size="small"
          variant="primary"
          @click="handleAcceptAll"
        >
          Accept all
        </Button>
        <Button
          class="cookie-banner__button cookie-banner__button--secondary"
          size="small"
          variant="outline"
          @click="handleReject"
        >
          Essential only
        </Button>
        <button
          type="button"
          class="cookie-banner__utility-link"
          :aria-expanded="showPreferences ? 'true' : 'false'"
          @click="togglePreferences"
        >
          {{ showPreferences ? "Hide preferences" : "Manage preferences" }}
        </button>
        <RouterLink
          class="cookie-banner__utility-link cookie-banner__privacy-link"
          to="/privacy"
        >
          Privacy policy
        </RouterLink>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.cookie-consent-enter-active,
.cookie-consent-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.cookie-consent-enter-from,
.cookie-consent-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.cookie-banner {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 40;
  width: min(360px, calc(100vw - 32px));
  padding: 18px;
  border: 1px solid var(--color-border-strong);
  border-radius: 14px;
  background: var(--color-bg);
  color: var(--color-text);
  box-shadow: var(--shadow-soft);
}

.cookie-banner__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
  padding-right: 24px;
}

.cookie-banner__dismiss {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.cookie-banner__dismiss:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

.cookie-banner__dismiss:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.cookie-banner__eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.cookie-banner__text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.cookie-banner__preferences {
  margin: 16px 0;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.cookie-banner__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cookie-banner__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cookie-banner__pref-title {
  font-size: 14px;
  font-weight: 600;
}

.cookie-banner__pref-description {
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.cookie-banner__save {
  width: 100%;
  margin-top: 14px;
}

.cookie-banner__button:deep(.me3-btn) {
  min-height: 36px;
  border-radius: 999px;
  padding-inline: 14px;
  font-weight: 600;
}

.cookie-banner__button--primary:deep(.me3-btn) {
  background: var(--brand-primary);
  color: var(--color-accent-contrast);
}

.cookie-banner__button--primary:deep(.me3-btn:hover:not(:disabled)) {
  background: var(--brand-primary-strong);
  opacity: 1;
}

.cookie-banner__button--secondary:deep(.me3-btn) {
  border-color: var(--color-border-strong);
  background: var(--color-bg);
  color: var(--color-text);
}

.cookie-banner__button--secondary:deep(.me3-btn:hover:not(:disabled)) {
  background: var(--color-bg-subtle);
  opacity: 1;
}

.cookie-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.cookie-banner__utility-link {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 4px 0;
  font: inherit;
  font-size: 11px;
  color: var(--color-text-muted);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.cookie-banner__utility-link:hover {
  color: var(--color-text);
}

.cookie-banner__privacy-link {
  margin-left: auto;
}

.cookie-banner__utility-link:focus-visible,
.cookie-toggle__input:focus-visible + .cookie-toggle__track {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.cookie-toggle {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}

.cookie-toggle__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.cookie-toggle__track {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 24px;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  background: var(--color-bg-subtle);
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.cookie-toggle__track::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  transition: transform 0.18s ease;
}

.cookie-toggle__input:checked + .cookie-toggle__track {
  background: var(--color-text);
  border-color: var(--color-text);
}

.cookie-toggle__input:checked + .cookie-toggle__track::after {
  transform: translateX(18px);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .cookie-banner {
    right: 16px;
    bottom: 16px;
    left: 16px;
    width: auto;
  }

  .cookie-banner__row {
    align-items: center;
  }

  .cookie-banner__actions {
    display: grid;
    grid-template-columns: max-content max-content;
    justify-content: start;
    align-items: center;
    column-gap: 12px;
    row-gap: 8px;
  }

  .cookie-banner__button {
    width: 100%;
  }

  .cookie-banner__utility-link,
  .cookie-banner__privacy-link {
    grid-row: 2;
  }

  .cookie-banner__privacy-link {
    margin-left: 0;
    justify-self: end;
  }
}
</style>
