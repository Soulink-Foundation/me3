<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../api";
import type { BillingUsage } from "../stores/sites";

const props = defineProps<{
  username: string;
  postTitle: string;
  postSlug: string;
  alreadySent?: boolean;
  needsPublish?: boolean;
  onPublish?: () => Promise<void>;
}>();

const emit = defineEmits<{
  close: [];
  sent: [broadcastId: string];
}>();

const isSending = ref(false);
const isPublishing = ref(false);
const isPreviewing = ref(false);
const error = ref<string | null>(null);
const publishProgress = ref<string | null>(null);

// Get subscriber count (placeholder - would come from API)
const recipientCount = ref(0);
const quotaRemaining = ref(0);
const quotaTotal = ref(0);
const willExceedQuota = ref(false);
const willIncurOverage = ref(false);
const overageAmount = ref(0);
const overageCost = ref(0);
const overageRate = ref(0);

// Load quota info on mount
onMounted(async () => {
  try {
    // Get subscriber count
    const subscribersRes = await api.get(
      `/sites/${props.username}/subscribers`
    );
    if (subscribersRes) {
      const data = subscribersRes as { subscribers?: unknown[] };
      recipientCount.value = data.subscribers?.length || 0;
    }

    // Get quota info
    const quotaRes = await api.get(`/billing/usage`);
    if (quotaRes) {
      const data = quotaRes as BillingUsage;
      quotaRemaining.value = data.emailQuotaRemaining || 0;
      quotaTotal.value = data.emailQuota || 0;
      const overageRatePerThousand = data.capabilities.emailOverageRate;

      if (overageRatePerThousand === 0 && recipientCount.value > quotaRemaining.value) {
        willExceedQuota.value = true;
      }

      if (overageRatePerThousand > 0 && recipientCount.value > quotaRemaining.value) {
        willIncurOverage.value = true;
        overageAmount.value = recipientCount.value - quotaRemaining.value;
        overageRate.value = overageRatePerThousand;
        overageCost.value =
          Math.ceil(overageAmount.value / 1000) * overageRatePerThousand;
      }
    }
  } catch (e) {
    console.error("Failed to load quota info:", e);
  }
});

async function sendBroadcast() {
  isSending.value = true;
  error.value = null;

  try {
    const response = await api.post<{
      broadcastId?: string;
      error?: string;
    }>(`/sites/${props.username}/posts/${props.postSlug}/broadcast`, {
      subject: props.postTitle,
    });

    if (response && "error" in response) {
      error.value = response.error || "Failed to send broadcast";
      return;
    }

    if (response && response.broadcastId) {
      emit("sent", response.broadcastId);
      emit("close");
    }
  } catch (e) {
    error.value = "Failed to send broadcast";
    console.error(e);
  } finally {
    isSending.value = false;
  }
}

async function handleAction() {
  // If needs publish, publish first then send
  if (props.needsPublish && props.onPublish) {
    isPublishing.value = true;
    publishProgress.value = "Publishing site...";
    error.value = null;

    try {
      await props.onPublish();
      publishProgress.value = "Sending broadcast...";
      await sendBroadcast();
    } catch (e: any) {
      error.value = e.message || "Failed to publish and send";
      console.error(e);
    } finally {
      isPublishing.value = false;
      publishProgress.value = null;
    }
  } else {
    // Just send
    await sendBroadcast();
  }
}

async function previewBroadcast() {
  if (isPreviewing.value) return;

  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    error.value = "Popup blocked. Please allow popups to view the preview.";
    return;
  }

  isPreviewing.value = true;
  error.value = null;

  try {
    previewWindow.document.open();
    previewWindow.document.write(
      '<p style="font-family: system-ui, sans-serif; padding: 24px;">Loading preview...</p>'
    );
    previewWindow.document.close();

    const response = await api.get<{ html?: string; error?: string }>(
      `/sites/${props.username}/posts/${props.postSlug}/broadcast/preview`
    );

    if (!response?.html) {
      throw new Error(response?.error || "Failed to load preview");
    }

    previewWindow.document.open();
    previewWindow.document.write(response.html);
    previewWindow.document.close();
  } catch (e: any) {
    error.value = e?.message || "Failed to load preview";
    previewWindow.document.open();
    previewWindow.document.write(
      '<p style="font-family: system-ui, sans-serif; padding: 24px;">Failed to load preview.</p>'
    );
    previewWindow.document.close();
  } finally {
    isPreviewing.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <h2>{{ alreadySent ? "Send again?" : "Send to subscribers?" }}</h2>

      <div class="broadcast-details">
        <p><strong>Post:</strong> {{ postTitle }}</p>
        <p><strong>Recipients:</strong> {{ recipientCount }} subscribers</p>
        <p v-if="!willExceedQuota">
          <strong>Quota remaining:</strong> {{ quotaRemaining }} emails
        </p>

        <div v-if="willExceedQuota" class="warning">
          ⚠️ This will exceed your monthly quota.
          <router-link to="/pricing">Upgrade to send more emails</router-link>
        </div>

        <div v-if="willIncurOverage" class="info">
          💡 This will use {{ overageAmount }} overage emails (billed at
          ${{ overageRate }} per 1,000 = ${{ overageCost }})
        </div>

        <div v-if="needsPublish" class="info">
          📢 Your site has unpublished changes. The latest version will be
          published before sending this email.
        </div>

        <div v-if="alreadySent" class="info">
          This post was already sent to subscribers. Sending again will create a
          new broadcast.
        </div>

        <div v-if="publishProgress" class="info">
          {{ publishProgress }}
        </div>

        <div v-if="error" class="error">
          {{ error }}
        </div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" class="button secondary">Cancel</button>
        <button
          @click="previewBroadcast"
          class="button secondary"
          :disabled="isSending || isPublishing || isPreviewing"
        >
          {{ isPreviewing ? "Loading preview..." : "Preview" }}
        </button>
        <button
          @click="handleAction"
          class="button primary"
          :disabled="
            willExceedQuota || isSending || isPublishing || recipientCount === 0
          "
        >
          {{
            isPublishing
              ? "Publishing..."
              : isSending
              ? "Sending..."
              : needsPublish
              ? "Publish & Send"
              : "Send Now"
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal h2 {
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 600;
  color: #111;
}

.broadcast-details {
  margin-bottom: 24px;
}

.broadcast-details p {
  margin: 0 0 12px;
  color: #333;
  font-size: 15px;
}

.warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  color: #856404;
  font-size: 14px;
}

.warning a {
  color: #0066cc;
  text-decoration: underline;
}

.info {
  background: #e7f3ff;
  border: 1px solid #0066cc;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  color: #004085;
  font-size: 14px;
}

.error {
  background: #f8d7da;
  border: 1px solid #dc3545;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  color: #721c24;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.button {
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.button.primary {
  background: #111;
  color: white;
}

.button.primary:hover:not(:disabled) {
  background: #333;
}

.button.primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.button.secondary {
  background: #f0f0f0;
  color: #333;
}

.button.secondary:hover {
  background: #e0e0e0;
}
</style>
