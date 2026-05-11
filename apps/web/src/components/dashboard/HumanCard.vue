<script setup lang="ts">
import { computed } from "vue";
import Card from "../Card.vue";
import { HUMAN_CARD_DEFAULT_LINKS } from "../../utils/human-tabs";

const DEFAULT_LINKS = HUMAN_CARD_DEFAULT_LINKS;

const props = withDefaults(
  defineProps<{
    /** Pending reminders (from dashboard); badge on Calendar when count is positive */
    calendarReminderCount?: number;
    remindersLoading?: boolean;
    /** Pending inbox drafts; badge on Email when count is positive */
    inboxDraftCount?: number | null;
    inboxDraftLoading?: boolean;
    links?: ReadonlyArray<{ to: string; label: string }>;
  }>(),
  {
    calendarReminderCount: 0,
    remindersLoading: false,
    inboxDraftCount: null,
    inboxDraftLoading: false,
  },
);

const links = computed(() => props.links ?? DEFAULT_LINKS);
</script>

<template>
  <Card>
    <div class="card__head">
      <h3 class="card__title">Human</h3>
    </div>

    <nav class="card__body human-links" aria-label="Human quick links">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="human-pill"
      >
        {{ link.label }}
        <span
          v-if="
            link.to === '/calendar' &&
            !remindersLoading &&
            calendarReminderCount > 0
          "
          class="human-badge"
          :aria-label="`${calendarReminderCount} reminders`"
        >
          {{ calendarReminderCount }}
        </span>
        <span
          v-if="
            link.to === '/email' &&
            !inboxDraftLoading &&
            inboxDraftCount !== null &&
            inboxDraftCount > 0
          "
          class="human-badge"
          :aria-label="`${inboxDraftCount} drafts awaiting review`"
        >
          {{ inboxDraftCount }}
        </span>
      </router-link>
    </nav>
  </Card>
</template>

<style scoped>
.human-links {
  display: grid !important;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.human-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
}

.human-pill:hover {
  background: var(--color-bg-subtle);
  border-color: var(--color-text);
}

.human-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--color-text);
  color: var(--color-bg);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

@media (max-width: 640px) {
  .human-links {
    grid-template-columns: 1fr;
  }
}
</style>
