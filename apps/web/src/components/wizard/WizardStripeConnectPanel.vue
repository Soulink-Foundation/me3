<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useAuthStore } from "../../stores/auth";
import { api } from "../../api";
import {
  STRIPE_CONNECT_COUNTRIES,
  getInitialStripeConnectCountry,
  persistStripeConnectCountry,
} from "../../utils/stripeConnect";
import { useAppToast } from "../../composables/useAppToast";

export type StripeConnectStatus =
  | "not_connected"
  | "pending"
  | "active"
  | "restricted";

const props = withDefaults(
  defineProps<{
    /** When true, renders padded bordered card (shop). When false, inline (bookings payments block). */
    bordered?: boolean;
    /** Prefix for payout country select ids, e.g. `shop-stripe` → `shop-stripe-country`. */
    idPrefix: string;
    connectedHint: string;
    /** Shown above the connect button when not connected. Omit to hide. */
    notConnectedHint?: string;
  }>(),
  {
    bordered: true,
    notConnectedHint: undefined,
  },
);

const emit = defineEmits<{
  "update:connectStatus": [value: StripeConnectStatus];
}>();

const auth = useAuthStore();
const { toastError } = useAppToast();

const stripeConnectStatus = ref<StripeConnectStatus>("not_connected");
const stripeConnectLoaded = ref(false);
const isConnectingStripe = ref(false);
const isDisconnectingStripe = ref(false);
const stripeConnectCountry = ref(getInitialStripeConnectCountry());

const countrySelectIdRestricted = `${props.idPrefix}-country`;
const countrySelectIdNew = `${props.idPrefix}-country-new`;

watch(
  stripeConnectStatus,
  (v) => {
    emit("update:connectStatus", v);
  },
  { immediate: true },
);

async function checkStripeConnectStatus() {
  if (!auth.isAuthenticated) {
    stripeConnectLoaded.value = true;
    return;
  }

  try {
    const data = await api.get<{ status?: string }>("/stripe-connect/status");
    stripeConnectStatus.value =
      (data.status as StripeConnectStatus) || "not_connected";
  } catch (error) {
    console.error("Failed to check Stripe Connect status:", error);
    stripeConnectStatus.value = "not_connected";
  } finally {
    stripeConnectLoaded.value = true;
  }
}

async function connectStripe() {
  if (!auth.isAuthenticated || isConnectingStripe.value) return;
  isConnectingStripe.value = true;

  try {
    persistStripeConnectCountry(stripeConnectCountry.value);
    const data = await api.post<{ url?: string; error?: string }>(
      "/stripe-connect/onboard",
      { country: stripeConnectCountry.value },
    );
    if (data.url) {
      window.location.href = data.url;
    } else {
      toastError(data.error || "Failed to connect Stripe");
    }
  } catch (error) {
    console.error("Failed to connect Stripe:", error);
    toastError("Failed to connect Stripe. Please try again.");
  } finally {
    isConnectingStripe.value = false;
  }
}

async function disconnectStripe() {
  if (!auth.isAuthenticated || isDisconnectingStripe.value) return;
  if (
    !window.confirm(
      "Disconnect this Stripe account? You can reconnect a different one afterwards.",
    )
  ) {
    return;
  }

  isDisconnectingStripe.value = true;
  try {
    await api.post<{ success: boolean; error?: string }>(
      "/stripe-connect/disconnect",
    );
    stripeConnectStatus.value = "not_connected";
  } catch (error) {
    console.error("Failed to disconnect Stripe:", error);
    toastError("Failed to disconnect Stripe. Please try again.");
  } finally {
    isDisconnectingStripe.value = false;
  }
}

onMounted(async () => {
  await checkStripeConnectStatus();
});
</script>

<template>
  <div
    v-if="stripeConnectLoaded"
    class="wizard-stripe-connect"
    :class="{ 'wizard-stripe-connect--bordered': bordered }"
  >
    <div v-if="stripeConnectStatus === 'active'" class="stripe-connected">
      <div class="stripe-status-row">
        <div class="connect-status">
          <span class="status-icon">✓</span>
          <span class="status-text">Stripe Connected</span>
        </div>
        <button
          type="button"
          class="disconnect-btn"
          :disabled="isDisconnectingStripe"
          @click="disconnectStripe"
        >
          {{ isDisconnectingStripe ? "Disconnecting..." : "Disconnect" }}
        </button>
      </div>
      <p class="connect-hint">
        {{ connectedHint }}
      </p>
    </div>
    <div
      v-else-if="stripeConnectStatus === 'restricted'"
      class="stripe-restricted"
    >
      <div class="stripe-country-field">
        <label :for="countrySelectIdRestricted">Payout country</label>
        <select
          :id="countrySelectIdRestricted"
          v-model="stripeConnectCountry"
          :disabled="isConnectingStripe || isDisconnectingStripe"
        >
          <option
            v-for="country in STRIPE_CONNECT_COUNTRIES"
            :key="country.value"
            :value="country.value"
          >
            {{ country.label }}
          </option>
        </select>
      </div>
      <div class="stripe-status-row">
        <div class="connect-status">
          <span class="status-icon">!</span>
          <span class="status-text">Setup Incomplete</span>
        </div>
        <button
          type="button"
          class="disconnect-btn"
          :disabled="isDisconnectingStripe || isConnectingStripe"
          @click="disconnectStripe"
        >
          {{ isDisconnectingStripe ? "Disconnecting..." : "Disconnect" }}
        </button>
      </div>
      <p class="connect-hint">
        Please complete your Stripe onboarding to receive payouts.
      </p>
      <button
        type="button"
        class="connect-btn"
        :disabled="isConnectingStripe || isDisconnectingStripe"
        @click="connectStripe"
      >
        {{ isConnectingStripe ? "Connecting..." : "Complete Setup" }}
      </button>
    </div>
    <div v-else class="stripe-not-connected">
      <div class="stripe-country-field">
        <label :for="countrySelectIdNew">Payout country</label>
        <select
          :id="countrySelectIdNew"
          v-model="stripeConnectCountry"
          :disabled="isConnectingStripe"
        >
          <option
            v-for="country in STRIPE_CONNECT_COUNTRIES"
            :key="country.value"
            :value="country.value"
          >
            {{ country.label }}
          </option>
        </select>
      </div>
      <p v-if="notConnectedHint" class="connect-hint">
        {{ notConnectedHint }}
      </p>
      <button
        type="button"
        class="connect-btn stripe"
        :disabled="isConnectingStripe"
        @click="connectStripe"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" class="stripe-icon">
          <path
            fill="currentColor"
            d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.471-5.747-6.591-7.305z"
          />
        </svg>
        {{ isConnectingStripe ? "Connecting..." : "Connect Stripe" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wizard-stripe-connect--bordered {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid var(--color-border);
  background: var(--color-bg);
}

.stripe-connected .connect-status,
.stripe-restricted .connect-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.stripe-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.stripe-status-row .connect-status {
  margin-bottom: 0;
}

.status-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #22c55e;
  color: white;
  font-size: 12px;
}

.stripe-restricted .status-icon {
  background: #f59e0b;
}

.connect-hint {
  margin: 0 0 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.stripe-not-connected .connect-hint {
  margin-bottom: 12px;
}

.stripe-country-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.stripe-country-field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-muted);
}

.stripe-country-field select {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: inherit;
}

.connect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
}

.connect-btn:hover:not(:disabled) {
  border-color: var(--color-text);
}

.connect-btn.stripe {
  background: #635bff;
  color: white;
  border: none;
}

.connect-btn.stripe:hover:not(:disabled) {
  background: #4f49cc;
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.disconnect-btn {
  padding: 6px 12px;
  font-size: 13px;
  background: none;
  border: 1px solid var(--color-text-muted);
  border-radius: 6px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.disconnect-btn:hover:not(:disabled) {
  border-color: #ef4444;
  color: #ef4444;
}

.disconnect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stripe-icon {
  display: inline-flex;
  flex-shrink: 0;
}

.status-text {
  font-size: 14px;
}
</style>
