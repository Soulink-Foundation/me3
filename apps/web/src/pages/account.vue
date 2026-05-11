<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AGENT_LOCALE_OPTIONS,
  getAgentLocaleDisplayLabel,
  inferLocaleFromTimeZone,
} from "../../../../shared/agent-locales";
import { api } from "../api";
import TelegramConnectPanel from "../components/TelegramConnectPanel.vue";
import { useAuthStore } from "../stores/auth";
import {
  detectBrowserTimeZone,
  getTimeZoneDisplayLabel,
  isValidTimeZone,
  listSupportedTimeZones,
} from "../utils/timezone";
import {
  telegramAccordionStatusClass,
  telegramAccordionStatusLabel,
} from "../utils/telegram-connection-ui";

definePage({
  meta: {
    requiresAuth: true,
    title: "Account | ME3",
    description: "Manage your local ME3 Core account settings.",
    robots: "noindex,follow",
  },
});

type AccountResponse = {
  user: {
    id: string;
    email: string | null;
    name: string;
    username: string;
    timezone: string | null;
    locale: string;
    localeSource: "explicit" | "inferred";
  };
};

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const timezoneInput = ref("");
const savedTimezoneInput = ref("");
const localeInput = ref("");
const savedLocaleInput = ref("");
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const deleteConfirmInput = ref("");
const deleteLoading = ref(false);
const deleteError = ref<string | null>(null);
const supportedTimeZones = listSupportedTimeZones();

const telegramPanelRef = ref<InstanceType<typeof TelegramConnectPanel> | null>(
  null,
);

const openSection = ref({
  email: true,
  regional: false,
  mailbox: false,
  telegram: false,
});

const effectiveLocaleValue = computed(
  () => localeInput.value || inferLocaleFromTimeZone(timezoneInput.value),
);

const effectiveLocaleLabel = computed(() =>
  getAgentLocaleDisplayLabel(effectiveLocaleValue.value),
);

const localeOptions = computed(() => {
  const currentValue = localeInput.value || auth.user?.locale || "";
  if (
    !currentValue ||
    AGENT_LOCALE_OPTIONS.some((option) => option.value === currentValue)
  ) {
    return AGENT_LOCALE_OPTIONS;
  }
  return [
    {
      value: currentValue,
      label: getAgentLocaleDisplayLabel(currentValue),
    },
    ...AGENT_LOCALE_OPTIONS,
  ];
});

const timezoneDisplay = computed(() => {
  const value = timezoneInput.value || auth.user?.timezone || "";
  if (!value || !isValidTimeZone(value)) return "UTC";
  return getTimeZoneDisplayLabel(value);
});

const saveDisabled = computed(
  () =>
    saving.value ||
    !timezoneInput.value ||
    !isValidTimeZone(timezoneInput.value) ||
    (timezoneInput.value === savedTimezoneInput.value &&
      localeInput.value === savedLocaleInput.value),
);

const telegramStatusLabel = computed(() => {
  const panel = telegramPanelRef.value;
  if (!panel) return "";
  return telegramAccordionStatusLabel(
    panel.available,
    panel.configured,
    panel.connection,
  );
});

const telegramStatusClass = computed(() => {
  const panel = telegramPanelRef.value;
  if (!panel) return "pending_setup";
  return telegramAccordionStatusClass(panel.available, panel.connection);
});

function syncAccount(response: AccountResponse) {
  auth.setSession({
    ...response.user,
    name: response.user.name ?? auth.user?.name ?? "ME3 Core Owner",
    username: response.user.username ?? auth.user?.username ?? "owner",
  });
  timezoneInput.value = response.user.timezone || "";
  savedTimezoneInput.value = timezoneInput.value;
  localeInput.value =
    response.user.localeSource === "explicit" ? response.user.locale : "";
  savedLocaleInput.value = localeInput.value;
}

async function loadAccount() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get<AccountResponse>("/account");
    syncAccount(response);
  } catch (e: any) {
    error.value = e.message || "Failed to load account settings";
  } finally {
    loading.value = false;
  }
}

function detectTimezoneValue() {
  const detected = detectBrowserTimeZone();
  if (!detected || !isValidTimeZone(detected)) {
    error.value = "Could not detect a valid browser timezone.";
    return;
  }
  timezoneInput.value = detected;
  message.value = null;
  error.value = null;
}

async function saveSettings() {
  if (saveDisabled.value) return;
  saving.value = true;
  message.value = null;
  error.value = null;
  try {
    const response = await api.put<AccountResponse>("/account", {
      timezone: timezoneInput.value,
      locale: localeInput.value || null,
    });
    syncAccount(response);
    message.value = "Regional settings updated.";
  } catch (e: any) {
    error.value = e.message || "Failed to save regional settings";
  } finally {
    saving.value = false;
  }
}

async function logout() {
  await auth.logout();
  router.push("/");
}

function openDeleteModal() {
  deleteConfirmInput.value = "";
  deleteError.value = null;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  if (deleteLoading.value) return;
  showDeleteModal.value = false;
}

async function deleteAccount() {
  if (deleteLoading.value) return;
  if (deleteConfirmInput.value.trim() !== "DELETE") {
    deleteError.value = 'Type "DELETE" to confirm.';
    return;
  }
  deleteLoading.value = true;
  deleteError.value = null;
  try {
    await api.post("/account/delete", {});
    await auth.logout();
    router.push("/");
  } catch (e: any) {
    deleteError.value = e.message || "Failed to delete account.";
  } finally {
    deleteLoading.value = false;
  }
}

onMounted(async () => {
  await loadAccount();
  if (route.query.section === "telegram") {
    openSection.value.telegram = true;
  }
  if (route.query.section === "mailbox") {
    openSection.value.mailbox = true;
  }
});
</script>

<template>
  <div class="account-page">
    <Teleport to="#app-side-nav-mobile-page-controls">
      <div class="account-mobile-title">Account</div>
    </Teleport>

    <main class="main">
      <h1>Account</h1>

      <div v-if="loading" class="status-row">Loading account...</div>

      <template v-else>
        <section class="card accordion-card">
          <button
            id="account-trigger-email"
            class="accordion-trigger"
            type="button"
            :aria-expanded="openSection.email"
            aria-controls="account-panel-email"
            @click="openSection.email = !openSection.email"
          >
            <span class="accordion-title-wrap">
              <h2>Account email</h2>
            </span>
            <span class="accordion-chevron" aria-hidden="true">▼</span>
          </button>
          <div
            id="account-panel-email"
            class="accordion-panel"
            role="region"
            aria-labelledby="account-trigger-email"
            :hidden="!openSection.email"
          >
            <div class="email-row">
              <input
                class="input"
                type="email"
                :value="auth.user?.email || ''"
                disabled
              />
              <button class="button secondary" type="button" @click="logout">
                Sign out
              </button>
            </div>
          </div>
        </section>

        <section class="card accordion-card">
          <button
            id="account-trigger-regional"
            class="accordion-trigger"
            type="button"
            :aria-expanded="openSection.regional"
            aria-controls="account-panel-regional"
            @click="openSection.regional = !openSection.regional"
          >
            <span class="accordion-title-wrap accordion-title-flex">
              <h2>Regional settings</h2>
              <span class="accordion-header-hint">
                {{ effectiveLocaleLabel }}
              </span>
            </span>
            <span class="accordion-chevron" aria-hidden="true">▼</span>
          </button>
          <div
            id="account-panel-regional"
            class="accordion-panel"
            role="region"
            aria-labelledby="account-trigger-regional"
            :hidden="!openSection.regional"
          >
            <p class="hint">
              Agent replies follow your locale preference, and scheduled jobs,
              briefings, and account-level dates use your timezone.
            </p>
            <div class="timezone-grid">
              <label class="field">
                <span>Timezone</span>
                <input
                  v-model="timezoneInput"
                  class="input"
                  type="text"
                  list="account-timezone-options"
                  placeholder="Start typing a timezone"
                  spellcheck="false"
                />
                <datalist id="account-timezone-options">
                  <option
                    v-for="zone in supportedTimeZones"
                    :key="zone"
                    :value="zone"
                  >
                    {{ getTimeZoneDisplayLabel(zone) }}
                  </option>
                </datalist>
              </label>

              <label class="field">
                <span>Agent locale</span>
                <select v-model="localeInput" class="input">
                  <option value="">
                    Use timezone default ({{ effectiveLocaleLabel }})
                  </option>
                  <option
                    v-for="option in localeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <div class="timezone-summary">
                <span class="timezone-summary-label">Current timezone</span>
                <strong>{{ timezoneDisplay }}</strong>
                <span class="timezone-summary-label">Agent locale</span>
                <strong>{{ effectiveLocaleLabel }}</strong>
                <span class="timezone-summary-label">
                  {{
                    localeInput
                      ? "Saved explicitly."
                      : `Defaulting from ${timezoneInput || "UTC"}.`
                  }}
                </span>
              </div>
            </div>

            <div class="button-row">
              <button
                class="button secondary"
                type="button"
                @click="detectTimezoneValue"
              >
                Detect from browser
              </button>
              <button
                class="button primary"
                type="button"
                :disabled="saveDisabled"
                @click="saveSettings"
              >
                {{ saving ? "Saving..." : "Save regional settings" }}
              </button>
            </div>

            <p v-if="message" class="success">{{ message }}</p>
            <p v-if="error" class="error">{{ error }}</p>
          </div>
        </section>

        <section class="card accordion-card">
          <button
            id="account-trigger-mailbox"
            class="accordion-trigger"
            type="button"
            :aria-expanded="openSection.mailbox"
            aria-controls="account-panel-mailbox"
            @click="openSection.mailbox = !openSection.mailbox"
          >
            <span class="accordion-title-wrap accordion-title-flex">
              <h2>Mailbox settings</h2>
              <span class="status-badge active">Core</span>
              <span class="accordion-header-hint">
                Account-level mailbox configuration is being tracked for Core.
              </span>
            </span>
            <span class="accordion-chevron" aria-hidden="true">▼</span>
          </button>
          <div
            id="account-panel-mailbox"
            class="accordion-panel"
            role="region"
            aria-labelledby="account-trigger-mailbox"
            :hidden="!openSection.mailbox"
          >
            <div class="recommended-card">
              <span class="recommended-pill">Core follow-up</span>
              <h3>Mailbox configuration belongs in ME3 Core</h3>
              <p class="hint">
                The account surface should expose alias, source, forwarding,
                and mailbox health controls without hosted-only billing or
                production Cloudflare routing assumptions.
              </p>
              <router-link class="button secondary link-button-inline" to="/email">
                Open mailbox
              </router-link>
            </div>
          </div>
        </section>

        <section class="card accordion-card">
          <button
            id="account-trigger-telegram"
            class="accordion-trigger"
            type="button"
            :aria-expanded="openSection.telegram"
            aria-controls="account-panel-telegram"
            @click="openSection.telegram = !openSection.telegram"
          >
            <span class="accordion-title-wrap accordion-title-flex">
              <h2>Telegram settings</h2>
              <span
                v-if="telegramPanelRef?.available"
                class="status-badge"
                :class="telegramStatusClass"
              >
                {{ telegramStatusLabel }}
              </span>
            </span>
            <span class="accordion-chevron" aria-hidden="true">▼</span>
          </button>
          <div
            id="account-panel-telegram"
            class="accordion-panel"
            role="region"
            aria-labelledby="account-trigger-telegram"
            :hidden="!openSection.telegram"
          >
            <TelegramConnectPanel
              ref="telegramPanelRef"
              variant="default"
              :auto-prepare-when-not-connected="
                route.query.section === 'telegram'
              "
            />
          </div>
        </section>

        <section class="danger-section">
          <h2>Danger zone</h2>
          <div class="danger-card">
            <div>
              <strong>Delete your account</strong>
              <p>
                This will permanently delete your ME3 Core account, all of your
                sites, and associated data. This action cannot be undone.
              </p>
            </div>
            <button class="button danger" type="button" @click="openDeleteModal">
              Delete
            </button>
          </div>
        </section>
      </template>
    </main>

    <div
      v-if="showDeleteModal"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Delete account"
      @click.self="closeDeleteModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>Delete account</h2>
          <button
            class="modal-close"
            type="button"
            :disabled="deleteLoading"
            @click="closeDeleteModal"
          >
            ×
          </button>
        </div>

        <p class="hint">
          This will permanently delete your ME3 Core account, all of your sites,
          and associated data. This cannot be undone.
        </p>

        <div class="delete-confirm">
          <p class="confirm-text">
            To confirm, type
            <code>DELETE</code>
            below.
          </p>
          <input
            v-model="deleteConfirmInput"
            class="input"
            type="text"
            placeholder="DELETE"
            :disabled="deleteLoading"
          />
        </div>

        <div class="modal-actions">
          <button
            class="button secondary"
            type="button"
            :disabled="deleteLoading"
            @click="closeDeleteModal"
          >
            Cancel
          </button>
          <button
            class="button danger"
            type="button"
            :disabled="deleteLoading || deleteConfirmInput.trim() !== 'DELETE'"
            @click="deleteAccount"
          >
            {{ deleteLoading ? "Deleting..." : "Delete account" }}
          </button>
        </div>

        <p v-if="deleteError" class="error">{{ deleteError }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
}

.main {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px 40px;
}

h1 {
  margin: 0 0 24px;
  font-size: 28px;
  line-height: 1.1;
}

.account-mobile-title {
  display: none;
}

.card {
  margin-bottom: 20px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg);
}

.accordion-card {
  padding: 0;
  overflow: hidden;
}

.accordion-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.accordion-trigger:hover {
  background: var(--color-bg-subtle);
}

.accordion-title-wrap h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.accordion-title-flex {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  min-width: 0;
}

.accordion-header-hint {
  flex: 1 1 200px;
  min-width: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.35;
}

.accordion-chevron {
  flex-shrink: 0;
  font-size: 11px;
  opacity: 0.65;
  transition: transform 0.2s ease;
}

.accordion-trigger[aria-expanded="true"] .accordion-chevron {
  transform: rotate(180deg);
}

.accordion-panel {
  padding: 10px 16px 16px;
}

.email-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.email-row .input {
  flex: 1;
}

.hint {
  margin: 0 0 16px;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.field {
  display: grid;
  gap: 8px;
  color: var(--color-text);
  font-size: 14px;
}

.timezone-grid {
  display: grid;
  gap: 16px;
}

.timezone-summary {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-subtle);
}

.timezone-summary-label {
  color: var(--color-text-muted);
  font-size: 12px;
}

.recommended-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.08);
}

.recommended-card h3 {
  margin: 0;
  font-size: 16px;
}

.recommended-card .hint {
  margin-bottom: 0;
}

.recommended-pill {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(46, 125, 50, 0.16);
  color: #2e7d32;
  font-size: 12px;
  font-weight: 700;
}

.input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  box-sizing: border-box;
}

.input:disabled {
  color: var(--color-text-muted);
  opacity: 1;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0 0;
}

.button {
  padding: 12px 18px;
  border: none;
  border-radius: 10px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.button.primary {
  background: var(--color-text);
  color: var(--color-bg);
}

.button.secondary {
  background: var(--color-border);
  color: var(--color-text);
}

.button.danger {
  background: #e53935;
  color: #ffffff;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.link-button-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  text-decoration: none;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 12px;
  border-radius: 12px;
  background: var(--color-border);
  color: var(--color-text-muted);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.14);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.status-badge.active {
  background: rgba(76, 175, 80, 0.14);
  color: #2e7d32;
}

.status-badge.pending_setup,
.status-badge.pending {
  background: rgba(255, 179, 0, 0.16);
  color: #9a6700;
}

.status-badge.paused,
.status-badge.disconnected {
  background: rgba(229, 57, 53, 0.14);
  color: #c62828;
}

.success {
  margin: 12px 0 0;
  color: #2e7d32;
  font-size: 14px;
  font-weight: 600;
}

.error {
  margin: 12px 0 0;
  color: #e53935;
  font-size: 14px;
  font-weight: 600;
}

.danger-section {
  margin-top: 32px;
}

.danger-section h2 {
  margin: 0 0 12px;
  color: #e53935;
  font-size: 18px;
}

.danger-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid
    color-mix(in oklab, #e53935 34%, var(--color-border));
  border-radius: 12px;
  background: color-mix(in oklab, #e53935 12%, var(--color-bg-subtle));
}

.danger-card strong {
  color: var(--color-text);
  font-size: 14px;
}

.danger-card p {
  margin: 2px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.modal {
  width: min(560px, 100%);
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.modal-header h2 {
  margin: 0;
}

.modal-close {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.delete-confirm {
  display: grid;
  gap: 8px;
  margin: 16px 0;
}

.confirm-text {
  margin: 0;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 720px) {
  .main {
    padding: 16px;
  }

  .main > h1 {
    display: none;
  }

  .account-mobile-title {
    display: block;
    min-width: 0;
    overflow: hidden;
    color: var(--color-text);
    font-size: 15px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .danger-card,
  .email-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .email-row .button,
  .danger-card .button {
    width: 100%;
  }
}

@media (prefers-color-scheme: dark) {
  .recommended-card {
    background: rgba(46, 125, 50, 0.14);
    border-color: rgba(129, 199, 132, 0.32);
  }

  .recommended-pill {
    color: #c8e6c9;
  }
}
</style>
