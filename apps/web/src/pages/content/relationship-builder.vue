<script setup lang="ts">
import { onMounted, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import Button from "../../components/Button.vue";
import { api } from "../../api";
import { useRelationshipSuggestionCount } from "../../composables/useRelationshipSuggestionCount";
import type { AgentJob } from "../../types/agent-jobs";

definePage({
  meta: {
    requiresAuth: true,
    requiresWorkspace: true,
    title: "👥 Relationship Builder",
    description:
      "Review engagement suggestions and reactivation drafts from your ME3 agent.",
    robots: "noindex,follow",
  },
});

type RelationshipStatus =
  | "suggested"
  | "approved"
  | "completed"
  | "skipped"
  | "irrelevant"
  | "expired";
type RelationshipPhase = "connect" | "deepen" | "invite";
type RelationshipFilter = "all" | "conversations" | "reactivations" | "invite";

type RelationshipSuggestion = {
  id: string;
  platform: "reddit" | "linkedin" | "instagram" | "x" | "web" | "manual";
  platformUrl: string;
  platformUser: string | null;
  postTitle: string | null;
  contextSnippet: string | null;
  relevanceReason: string | null;
  relevanceScore: number | null;
  engagementType:
    | "comment"
    | "answer"
    | "share_resource"
    | "follow"
    | "connect";
  draftContent: string | null;
  status: RelationshipStatus;
  phase: RelationshipPhase;
  personKey: string | null;
  interactionCount: number;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
  actedAt: string | null;
  expiresAt: string | null;
  kind: "conversation" | "reactivation";
};

type RelationshipsResponse = {
  suggestions: RelationshipSuggestion[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    total: number;
    pending: number;
    conversations: number;
    reactivations: number;
    readyToInvite: number;
  };
};

const loading = ref(false);
const error = ref("");
const feedbackMessage = ref("");
const feedbackTone = ref<"info" | "error">("info");
const suggestions = ref<RelationshipSuggestion[]>([]);
const expandedId = ref<string | null>(null);
const savingId = ref<string | null>(null);
const activeFilter = ref<RelationshipFilter>("all");
const summary = ref<RelationshipsResponse["summary"]>({
  total: 0,
  pending: 0,
  conversations: 0,
  reactivations: 0,
  readyToInvite: 0,
});
const relationshipJob = ref<AgentJob | null>(null);
const draftEdits = ref<Record<string, string>>({});
const { refreshRelationshipSuggestionCount } = useRelationshipSuggestionCount();

const filterOptions: Array<{ id: RelationshipFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "conversations", label: "Conversations" },
  { id: "reactivations", label: "Reactivations" },
  { id: "invite", label: "Ready to invite" },
];

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeTime(value: string | null): string {
  if (!value) return "—";
  const then = Date.parse(value);
  if (!Number.isFinite(then)) return value;
  const diffMs = then - Date.now();
  const diffHours = Math.round(diffMs / 3_600_000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffMs / 86_400_000);
  return rtf.format(diffDays, "day");
}

function getTitle(item: RelationshipSuggestion): string {
  return item.kind === "reactivation"
    ? item.contactName || "Reactivation"
    : item.postTitle || item.platformUrl;
}

function getPlatformLabel(item: RelationshipSuggestion): string {
  if (item.kind === "reactivation") return "Manual";
  return item.platform === "x"
    ? "X"
    : item.platform.charAt(0).toUpperCase() + item.platform.slice(1);
}

function getStatusLabel(status: RelationshipStatus): string {
  return status.replace(/_/g, " ");
}

function getDraftValue(item: RelationshipSuggestion): string {
  return draftEdits.value[item.id] ?? item.draftContent ?? "";
}

function canOpenLink(item: RelationshipSuggestion): boolean {
  return (
    item.platformUrl.startsWith("http") ||
    item.platformUrl.startsWith("mailto:")
  );
}

function setDraftValue(id: string, value: string) {
  draftEdits.value = {
    ...draftEdits.value,
    [id]: value,
  };
}

async function loadRelationshipJob() {
  try {
    const data = await api.get<{ jobs: AgentJob[] }>("/agent/jobs");
    relationshipJob.value =
      data.jobs.find((job) => job.jobType === "relationship_scan") || null;
  } catch {
    relationshipJob.value = null;
  }
}

async function loadSuggestions() {
  loading.value = true;
  error.value = "";

  try {
    const data = await api.get<RelationshipsResponse>(
      `/agent/relationships?filter=${activeFilter.value}&limit=50`,
    );
    suggestions.value = data.suggestions;
    summary.value = data.summary;

    const nextDrafts: Record<string, string> = {};
    for (const item of data.suggestions) {
      nextDrafts[item.id] =
        draftEdits.value[item.id] ?? item.draftContent ?? "";
    }
    draftEdits.value = nextDrafts;
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : "Failed to load relationship suggestions";
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
}

async function refreshPage() {
  await Promise.all([
    loadSuggestions(),
    loadRelationshipJob(),
    refreshRelationshipSuggestionCount(),
  ]);
}

function switchFilter(nextFilter: RelationshipFilter) {
  if (activeFilter.value === nextFilter) return;
  activeFilter.value = nextFilter;
  expandedId.value = null;
  feedbackMessage.value = "";
  void loadSuggestions();
}

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

async function updateSuggestion(
  item: RelationshipSuggestion,
  payload: Partial<{
    status: RelationshipStatus;
    phase: RelationshipPhase;
    draftContent: string;
  }>,
) {
  savingId.value = item.id;
  error.value = "";
  feedbackMessage.value = "";
  try {
    await api.put(`/agent/relationships/${item.id}`, payload);
    await refreshPage();
    feedbackTone.value = "info";
    feedbackMessage.value = "Suggestion updated.";
  } catch (err) {
    feedbackTone.value = "error";
    feedbackMessage.value =
      err instanceof Error ? err.message : "Failed to update suggestion";
  } finally {
    savingId.value = null;
  }
}

async function saveDraft(item: RelationshipSuggestion) {
  await updateSuggestion(item, { draftContent: getDraftValue(item) });
}

async function markStatus(
  item: RelationshipSuggestion,
  status: RelationshipStatus,
) {
  await updateSuggestion(item, {
    status,
    draftContent: getDraftValue(item),
  });
}

async function copyDraft(item: RelationshipSuggestion) {
  const text = getDraftValue(item);
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    feedbackTone.value = "info";
    feedbackMessage.value = "Draft copied.";
  } catch {
    feedbackTone.value = "error";
    feedbackMessage.value =
      "Couldn't copy automatically. You can still copy from the draft box.";
  }
}

onMounted(async () => {
  await refreshPage();
});
</script>

<template>
  <div class="agent-page">
    <main class="agent-main">
      <section class="summary-strip">
        <div class="summary-pill">
          <span class="summary-label">Pending</span>
          <strong>{{ summary.pending }}</strong>
        </div>
        <div class="summary-pill">
          <span class="summary-label">Conversations</span>
          <strong>{{ summary.conversations }}</strong>
        </div>
        <div class="summary-pill">
          <span class="summary-label">Reactivations</span>
          <strong>{{ summary.reactivations }}</strong>
        </div>
        <div class="summary-pill">
          <span class="summary-label">Ready to invite</span>
          <strong>{{ summary.readyToInvite }}</strong>
        </div>
        <router-link
          v-if="relationshipJob"
          class="job-link"
          :to="{ path: '/assistant', query: { job: relationshipJob.id } }"
        >
          {{ relationshipJob.enabled ? "Job active" : "Job paused" }}
        </router-link>
      </section>

      <div class="filter-row" role="tablist" aria-label="Relationship filters">
        <button
          v-for="filter in filterOptions"
          :key="filter.id"
          type="button"
          class="filter-chip"
          :class="{ 'filter-chip--active': activeFilter === filter.id }"
          :aria-selected="activeFilter === filter.id"
          @click="switchFilter(filter.id)"
        >
          {{ filter.label }}
        </button>
      </div>

      <div
        v-if="feedbackMessage"
        class="feedback-banner"
        :class="`feedback-banner--${feedbackTone}`"
        role="status"
        :aria-live="feedbackTone === 'error' ? 'assertive' : 'polite'"
      >
        {{ feedbackMessage }}
      </div>

      <div v-if="loading" class="state-card">
        Loading relationship suggestions…
      </div>
      <div v-else-if="error" class="state-card state-card--error">
        {{ error }}
      </div>
      <div v-else-if="suggestions.length === 0" class="state-card">
        No suggestions yet. Run a scan to find conversations worth joining or
        dormant relationships worth reactivating.
      </div>

      <template v-else>
        <section class="suggestions-list">
          <article
            v-for="item in suggestions"
            :key="item.id"
            class="suggestion-card"
          >
            <button
              type="button"
              class="suggestion-head"
              @click="toggleExpanded(item.id)"
            >
              <div class="suggestion-main">
                <div class="suggestion-topline">
                  <span class="kind-chip" :class="`kind-chip--${item.kind}`">
                    {{
                      item.kind === "conversation"
                        ? "Conversation"
                        : "Reactivation"
                    }}
                  </span>
                  <span class="meta-chip">{{ getPlatformLabel(item) }}</span>
                  <span class="meta-chip">{{ item.phase }}</span>
                  <span class="meta-chip">{{
                    getStatusLabel(item.status)
                  }}</span>
                </div>
                <h2>{{ getTitle(item) }}</h2>
                <p class="suggestion-why">
                  {{ item.relevanceReason || "Suggested for follow-up." }}
                </p>
              </div>
              <div class="suggestion-side">
                <span class="suggestion-age">{{
                  formatRelativeTime(item.createdAt)
                }}</span>
                <span class="expand-indicator">
                  {{ expandedId === item.id ? "Hide" : "Open" }}
                </span>
              </div>
            </button>

            <div v-if="expandedId === item.id" class="suggestion-body">
              <div class="detail-grid">
                <div>
                  <h3>Context</h3>
                  <p>
                    {{
                      item.contextSnippet || "No additional context available."
                    }}
                  </p>
                </div>
                <div>
                  <h3>Details</h3>
                  <p>Created: {{ formatDateTime(item.createdAt) }}</p>
                  <p v-if="item.contactName">Contact: {{ item.contactName }}</p>
                  <p v-if="item.platformUser">
                    Handle: {{ item.platformUser }}
                  </p>
                  <p v-if="item.relevanceScore !== null">
                    Relevance: {{ Math.round(item.relevanceScore * 100) }}%
                  </p>
                </div>
              </div>

              <label class="draft-field">
                <span>Draft</span>
                <textarea
                  :value="getDraftValue(item)"
                  rows="6"
                  @input="
                    setDraftValue(
                      item.id,
                      ($event.target as HTMLTextAreaElement).value,
                    )
                  "
                />
              </label>

              <div class="actions-row">
                <Button
                  variant="primary"
                  size="small"
                  type="button"
                  :disabled="savingId === item.id"
                  @click="saveDraft(item)"
                >
                  Save draft
                </Button>
                <Button
                  size="small"
                  type="button"
                  :disabled="savingId === item.id"
                  @click="copyDraft(item)"
                >
                  Copy draft
                </Button>
                <Button
                  v-if="canOpenLink(item)"
                  size="small"
                  :href="item.platformUrl"
                >
                  Open link
                </Button>
                <Button
                  size="small"
                  type="button"
                  :disabled="savingId === item.id"
                  @click="markStatus(item, 'completed')"
                >
                  Mark completed
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  :disabled="savingId === item.id"
                  @click="markStatus(item, 'skipped')"
                >
                  Skip
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  :disabled="savingId === item.id"
                  @click="markStatus(item, 'irrelevant')"
                >
                  Mark irrelevant
                </Button>
              </div>
            </div>
          </article>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.agent-page {
  min-height: 100vh;
}

.agent-main {
  margin: 0 auto;
  padding: 20px 40px 40px;
  display: grid;
  gap: 16px;
}

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.summary-pill {
  display: grid;
  gap: 4px;
  min-width: 120px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
}

.summary-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.job-link {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}

.job-link:hover {
  color: var(--color-text);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg);
  color: var(--color-text-muted);
  padding: 8px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.filter-chip--active {
  background: var(--color-text);
  border-color: var(--color-text);
  color: var(--color-bg);
}

.feedback-banner {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  background: var(--color-bg);
}

.feedback-banner--info {
  color: var(--color-text);
}

.feedback-banner--error {
  color: #b33b2e;
  border-color: rgba(179, 59, 46, 0.35);
  background: rgba(179, 59, 46, 0.06);
}

.suggestions-list {
  display: grid;
  gap: 12px;
}

.suggestion-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
}

.suggestion-head {
  width: 100%;
  padding: 16px 18px;
  background: transparent;
  border: none;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  cursor: pointer;
}

.suggestion-main h2 {
  margin: 8px 0 6px;
  font-size: 18px;
  line-height: 1.25;
}

.suggestion-topline {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kind-chip,
.meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.kind-chip--conversation {
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

.kind-chip--reactivation,
.meta-chip {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}

.suggestion-why {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.suggestion-side {
  display: grid;
  gap: 6px;
  justify-items: end;
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.expand-indicator {
  color: var(--color-text);
}

.suggestion-body {
  border-top: 1px solid var(--color-border);
  padding: 16px 18px 18px;
  display: grid;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-grid h3,
.draft-field span {
  display: block;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.detail-grid p {
  margin: 0 0 6px;
  font-size: 14px;
  line-height: 1.5;
}

.draft-field {
  display: grid;
  gap: 8px;
}

.draft-field textarea {
  width: 100%;
  min-height: 160px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.state-card {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-muted);
}

.state-card--error {
  color: #b33b2e;
}

@media (max-width: 960px) {
  .agent-main {
    padding-left: 20px;
    padding-right: 20px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .suggestion-head {
    flex-direction: column;
  }

  .suggestion-side {
    justify-items: start;
  }
}
</style>
