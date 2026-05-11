<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { api } from "../api";

const props = defineProps<{
  username: string;
  postTitle: string;
  postSlug: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

type BroadcastStatus = "queued" | "sending" | "completed" | "failed";

type RawBroadcast = {
  id: string;
  subject: string;
  status: BroadcastStatus;
  sent_at?: string;
  sentAt?: string;
  recipient_count?: number;
  recipientCount?: number;
  opens?: number;
  clicks?: number;
  failed_count?: number;
  failedCount?: number;
};

type Broadcast = {
  id: string;
  subject: string;
  status: BroadcastStatus;
  sentAt: string;
  recipientCount: number;
  opens: number;
  clicks: number;
  failedCount: number;
};

const broadcasts = ref<Broadcast[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

function normalizeBroadcast(raw: RawBroadcast): Broadcast {
  return {
    id: raw.id,
    subject: raw.subject,
    status: raw.status,
    sentAt: raw.sentAt || raw.sent_at || "",
    recipientCount: raw.recipientCount ?? raw.recipient_count ?? 0,
    opens: raw.opens ?? 0,
    clicks: raw.clicks ?? 0,
    failedCount: raw.failedCount ?? raw.failed_count ?? 0,
  };
}

async function loadStats() {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.get<{ broadcasts?: RawBroadcast[] }>(
      `/sites/${props.username}/broadcasts?postSlug=${encodeURIComponent(
        props.postSlug,
      )}&limit=5`,
    );

    broadcasts.value = (response?.broadcasts || []).map(normalizeBroadcast);
  } catch (e) {
    console.error(e);
    error.value = "Failed to load email stats";
  } finally {
    loading.value = false;
  }
}

const latest = computed(() => broadcasts.value[0] || null);

function formatDateTime(iso?: string): string {
  if (!iso) return "Not available";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRate(count: number, total: number): string {
  if (!total) return "Not available";
  return `${Math.round((count / total) * 100)}%`;
}

function formatStatus(status: BroadcastStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

onMounted(loadStats);

watch(
  () => [props.postSlug, props.username],
  () => {
    loadStats();
  },
);
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <div>
          <h2>Email stats</h2>
          <p class="subtitle">{{ postTitle }}</p>
        </div>
        <button class="close-btn" type="button" @click="emit('close')">
          Close
        </button>
      </div>

      <div v-if="loading" class="loading">Loading stats...</div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <div v-else-if="broadcasts.length === 0" class="empty">
        No email stats yet for this post.
      </div>

      <div v-else class="stats-content">
        <div class="summary">
          <div class="summary-item">
            <span class="label">Recipients</span>
            <span class="value">{{ latest?.recipientCount || 0 }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Opens</span>
            <span class="value">
              {{ latest?.opens || 0 }}
              <span class="rate">
                ({{ formatRate(latest?.opens || 0, latest?.recipientCount || 0) }})
              </span>
            </span>
          </div>
          <div class="summary-item">
            <span class="label">Clicks</span>
            <span class="value">
              {{ latest?.clicks || 0 }}
              <span class="rate">
                ({{ formatRate(latest?.clicks || 0, latest?.recipientCount || 0) }})
              </span>
            </span>
          </div>
          <div class="summary-item">
            <span class="label">Bounces</span>
            <span class="value">{{ latest?.failedCount || 0 }}</span>
          </div>
        </div>

        <div class="summary-meta">
          <span>Sent {{ formatDateTime(latest?.sentAt) }}</span>
          <span :class="['status', `status-${latest?.status || 'queued'}`]">
            {{ formatStatus(latest?.status || "queued") }}
          </span>
        </div>

        <div class="history">
          <h3>Recent sends</h3>
          <div class="history-header">
            <span>Sent</span>
            <span>Recipients</span>
            <span>Opens</span>
            <span>Clicks</span>
            <span>Status</span>
          </div>
          <div
            v-for="broadcast in broadcasts"
            :key="broadcast.id"
            class="history-row"
          >
            <span>{{ formatDateTime(broadcast.sentAt) }}</span>
            <span>{{ broadcast.recipientCount }}</span>
            <span>
              {{ broadcast.opens }}
              <span class="rate">
                ({{ formatRate(broadcast.opens, broadcast.recipientCount) }})
              </span>
            </span>
            <span>
              {{ broadcast.clicks }}
              <span class="rate">
                ({{ formatRate(broadcast.clicks, broadcast.recipientCount) }})
              </span>
            </span>
            <span class="status" :class="`status-${broadcast.status}`">
              {{ formatStatus(broadcast.status) }}
            </span>
          </div>
        </div>
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
  max-width: 720px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.modal h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #111;
}

.subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 14px;
}

.close-btn {
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.close-btn:hover {
  background: #f3f4f6;
}

.loading,
.error,
.empty {
  padding: 12px 0;
  font-size: 14px;
}

.error {
  color: #b42318;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.summary-item {
  background: #f7f7f8;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  color: #666;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.value {
  font-size: 18px;
  font-weight: 600;
  color: #111;
}

.rate {
  font-size: 12px;
  color: #666;
  margin-left: 4px;
}

.summary-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 0;
  font-size: 13px;
  color: #444;
}

.history {
  margin-top: 20px;
}

.history h3 {
  margin: 0 0 10px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #666;
}

.history-header,
.history-row {
  display: grid;
  grid-template-columns: 1.4fr 0.8fr 0.8fr 0.8fr 0.8fr;
  gap: 12px;
  align-items: center;
}

.history-header {
  font-size: 12px;
  color: #666;
  padding-bottom: 6px;
  border-bottom: 1px solid #eee;
}

.history-row {
  font-size: 13px;
  padding: 8px 0;
  border-bottom: 1px solid #f2f2f2;
}

.status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid transparent;
  width: fit-content;
}

.status-completed {
  background: #ecfdf3;
  color: #027a48;
  border-color: #abefc6;
}

.status-sending {
  background: #eff8ff;
  color: #175cd3;
  border-color: #b2ddff;
}

.status-queued {
  background: #fff7ed;
  color: #b54708;
  border-color: #fed7aa;
}

.status-failed {
  background: #fef3f2;
  color: #b42318;
  border-color: #fecdca;
}

@media (max-width: 720px) {
  .modal {
    padding: 24px;
  }

  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .history-header,
  .history-row {
    grid-template-columns: 1.4fr 0.8fr 0.8fr;
  }

  .history-header span:nth-child(4),
  .history-header span:nth-child(5),
  .history-row span:nth-child(4),
  .history-row span:nth-child(5) {
    display: none;
  }
}
</style>
