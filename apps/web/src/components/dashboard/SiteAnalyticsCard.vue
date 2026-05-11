<script setup lang="ts">
import { computed } from "vue";
import Card from "../Card.vue";
import type { SiteAnalyticsSummary } from "../../types/analytics";

const props = defineProps<{
  summary: SiteAnalyticsSummary | null;
  loading?: boolean;
  error?: string | null;
}>();

const deltaLabel = computed(() => {
  const delta = props.summary?.deltaPercentage;
  if (delta == null) return "No baseline yet";
  if (delta === 0) return "Flat vs last period";
  return delta > 0 ? `Up ${delta}%` : `Down ${Math.abs(delta)}%`;
});
</script>

<template>
  <Card>
    <div class="card__head analytics-head">
      <div>
        <h3 class="card__title">Site performance</h3>
        <p class="analytics-subtitle">Traffic from the last 7 days</p>
      </div>
    </div>

    <div class="card__body analytics-body">
      <div v-if="loading" class="analytics-state">Loading traffic…</div>
      <div v-else-if="error" class="analytics-state analytics-state--error">
        {{ error }}
      </div>
      <div v-else-if="summary" class="analytics-stats">
        <div class="analytics-row analytics-row--primary">
          <span class="analytics-label">Visits</span>
          <div class="analytics-value-wrap">
            <strong class="analytics-value">{{ summary.visits }}</strong>
            <span class="analytics-note">{{ deltaLabel }}</span>
          </div>
        </div>

        <div class="analytics-row">
          <span class="analytics-label">Top referrer</span>
          <strong class="analytics-value analytics-value--small">
            {{ summary.topReferrer || "Direct / unknown" }}
          </strong>
        </div>

        <div class="analytics-row">
          <span class="analytics-label">Top page</span>
          <strong class="analytics-value analytics-value--small">
            {{ summary.topPage || "No path data yet" }}
          </strong>
        </div>
      </div>
      <div v-else class="analytics-state">Traffic data will appear here soon.</div>
    </div>
  </Card>
</template>

<style scoped>
.analytics-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.analytics-subtitle {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

.analytics-body {
  gap: 12px;
}

.analytics-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.analytics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.analytics-row--primary {
  padding-top: 0;
  border-top: 0;
}

.analytics-label {
  color: var(--color-text-muted);
  font-size: 13px;
}

.analytics-value-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.analytics-value {
  font-size: 1.5rem;
  line-height: 1;
}

.analytics-value--small {
  font-size: 0.95rem;
  line-height: 1.35;
  text-align: right;
  word-break: break-word;
}

.analytics-note {
  color: var(--color-text-muted);
  font-size: 12px;
}

.analytics-state {
  color: var(--color-text-muted);
  font-size: 14px;
}

.analytics-state--error {
  color: var(--color-danger, #b42318);
}

@media (max-width: 640px) {
  .analytics-head,
  .analytics-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .analytics-value-wrap {
    align-items: flex-start;
  }

  .analytics-value--small {
    text-align: left;
  }
}
</style>
