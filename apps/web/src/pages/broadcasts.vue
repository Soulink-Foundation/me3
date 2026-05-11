<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useSitesStore } from "../stores/sites";
import { api } from "../api";

definePage({
  meta: {
    requiresAuth: true,
    requiresWorkspace: true,
    title: "Email Broadcasts | ME3",
    description: "History of emails sent to your newsletter subscribers.",
    robots: "noindex,follow",
  },
});

interface Broadcast {
  id: string;
  postSlug: string;
  subject: string;
  sentAt: string;
  recipientCount: number;
  status: "queued" | "sending" | "completed" | "failed";
  opens?: number;
  clicks?: number;
  failedCount?: number;
}

const sitesStore = useSitesStore();
const broadcasts = ref<Broadcast[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const currentPage = ref(1);
const totalPages = ref(1);

// Get username from first site (for now - could be improved to select specific site)
const username = computed(() => {
  if (sitesStore.sites.length > 0) {
    return sitesStore.sites[0].username;
  }
  return "";
});

async function loadBroadcasts() {
  if (!username.value) {
    // Load sites first
    await sitesStore.fetchSites();
    if (!username.value) return;
  }

  loading.value = true;
  error.value = null;

  try {
    const response = await api.get<{
      broadcasts?: Broadcast[];
      pagination?: { totalPages?: number };
    }>(
      `/sites/${username.value}/broadcasts?page=${currentPage.value}&limit=20`,
    );

    if (response) {
      broadcasts.value = response.broadcasts || [];
      totalPages.value = response.pagination?.totalPages || 1;
    }
  } catch (e) {
    error.value = "Failed to load broadcast history";
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeClass(status: Broadcast["status"]): string {
  switch (status) {
    case "completed":
      return "status-completed";
    case "sending":
      return "status-sending";
    case "queued":
      return "status-queued";
    case "failed":
      return "status-failed";
    default:
      return "";
  }
}

function getStatusLabel(status: Broadcast["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function goToPage(page: number) {
  currentPage.value = page;
  loadBroadcasts();
}

onMounted(() => {
  loadBroadcasts();
});
</script>

<template>
  <div class="broadcasts-page">
    <div class="page-header">
      <h1>Email Broadcasts</h1>
      <p>History of emails sent to your newsletter subscribers</p>
    </div>

    <div v-if="loading" class="loading">Loading broadcasts...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="broadcasts.length === 0" class="empty-state">
      <p>No broadcasts sent yet.</p>
      <p class="hint">
        Send your first broadcast from the Blog section in your site builder.
      </p>
    </div>

    <div v-else class="broadcasts-table">
      <table>
        <thead>
          <tr>
            <th>Post</th>
            <th>Subject</th>
            <th>Sent</th>
            <th>Recipients</th>
            <th>Opens</th>
            <th>Clicks</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="broadcast in broadcasts" :key="broadcast.id">
            <td>
              <router-link
                :to="`/${username}/blog/${broadcast.postSlug}`"
                class="post-link"
              >
                {{ broadcast.postSlug }}
              </router-link>
            </td>
            <td>{{ broadcast.subject }}</td>
            <td class="date">{{ formatDate(broadcast.sentAt) }}</td>
            <td class="number">{{ broadcast.recipientCount }}</td>
            <td class="number">
              {{ broadcast.opens || 0 }}
              <span
                v-if="broadcast.opens && broadcast.recipientCount"
                class="percentage"
              >
                ({{
                  Math.round(
                    (broadcast.opens / broadcast.recipientCount) * 100,
                  )
                }}%)
              </span>
            </td>
            <td class="number">
              {{ broadcast.clicks || 0 }}
              <span
                v-if="broadcast.clicks && broadcast.recipientCount"
                class="percentage"
              >
                ({{
                  Math.round(
                    (broadcast.clicks / broadcast.recipientCount) * 100,
                  )
                }}%)
              </span>
            </td>
            <td>
              <span
                :class="['status-badge', getStatusBadgeClass(broadcast.status)]"
              >
                {{ getStatusLabel(broadcast.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          ← Previous
        </button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.broadcasts-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: #111;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.loading,
.error {
  padding: 40px;
  text-align: center;
  color: #666;
}

.error {
  color: #dc3545;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  border: 1px dashed #ddd;
  border-radius: 12px;
}

.empty-state p {
  margin: 0 0 8px;
  color: #666;
  font-size: 16px;
}

.empty-state .hint {
  font-size: 14px;
  color: #999;
}

.broadcasts-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f8f8;
}

th {
  text-align: left;
  padding: 16px;
  font-weight: 600;
  font-size: 14px;
  color: #666;
  border-bottom: 1px solid #e0e0e0;
}

td {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

tbody tr:hover {
  background: #fafafa;
}

tbody tr:last-child td {
  border-bottom: none;
}

.post-link {
  color: #0066cc;
  text-decoration: none;
  font-weight: 500;
}

.post-link:hover {
  text-decoration: underline;
}

.date {
  color: #666;
  font-size: 14px;
}

.number {
  text-align: right;
  font-weight: 500;
}

.percentage {
  color: #999;
  font-size: 13px;
  font-weight: 400;
  margin-left: 4px;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

.status-sending {
  background: #dbeafe;
  color: #1e40af;
}

.status-queued {
  background: #fef3c7;
  color: #92400e;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  border-top: 1px solid #f0f0f0;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f8f8f8;
  border-color: #ccc;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .broadcasts-table {
    overflow-x: auto;
  }

  table {
    min-width: 800px;
  }
}
</style>
