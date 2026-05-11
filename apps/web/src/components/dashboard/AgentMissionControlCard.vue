<script setup lang="ts">
import { computed, onMounted } from "vue";
import type { BusinessPulseStats } from "../../types/analytics";
import { useAgentActiveJobsCount } from "../../composables/useAgentActiveJobsCount";
import { useUpcomingBookingsThisWeekCount } from "../../composables/useUpcomingBookingsThisWeekCount";
import Card from "../Card.vue";
import UiIcon from "../UiIcon.vue";

const props = withDefaults(
  defineProps<{
    pulse: BusinessPulseStats | null;
    pulseLoading?: boolean;
    pulseError?: string | null;
  }>(),
  {
    pulseLoading: false,
    pulseError: null,
  },
);

const { activeJobsCount, loadingActiveJobsCount, loadAgentActiveJobsCount } =
  useAgentActiveJobsCount();
const {
  upcomingBookingsCount,
  loadingUpcomingBookings,
  upcomingBookingsError,
  loadUpcomingBookingsThisWeekCount,
} = useUpcomingBookingsThisWeekCount();

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

const isLoading = computed(
  () =>
    loadingActiveJobsCount.value ||
    loadingUpcomingBookings.value ||
    props.pulseLoading,
);

const hasLoadError = computed(
  () =>
    (!loadingActiveJobsCount.value && activeJobsCount.value === null) ||
    (!loadingUpcomingBookings.value && upcomingBookingsCount.value === null) ||
    Boolean(upcomingBookingsError.value) ||
    Boolean(props.pulseError),
);

const hasCompleteSummary = computed(
  () =>
    activeJobsCount.value !== null &&
    upcomingBookingsCount.value !== null &&
    props.pulse !== null,
);

const STAT_EMOJI = {
  jobs: "⚙️",
  messages: "💬",
  bookings: "📅",
} as const;

onMounted(() => {
  void Promise.all([
    loadAgentActiveJobsCount(),
    loadUpcomingBookingsThisWeekCount(),
  ]);
});
</script>

<template>
  <Card>
    <div class="card__head">
      <h3 class="card__title">Assistant</h3>
    </div>

    <div class="card__body mc-body">
      <p v-if="isLoading" class="mc-text">Loading assistant summary…</p>
      <p v-else-if="hasLoadError" class="mc-text">
        We couldn't load your latest assistant summary right now.
      </p>
      <template v-else-if="hasCompleteSummary && pulse">
        <p class="mc-text mc-text--lead">Your ME3 assistant has:</p>
        <ul class="mc-bullets mc-text mc-text--lead">
          <li>
            <strong class="mc-stat">
              {{ STAT_EMOJI.jobs }} {{ activeJobsCount }} active
              {{ pluralize(activeJobsCount ?? 0, "job", "jobs") }}
            </strong>
            running
          </li>
          <li>
            Managed
            <strong class="mc-stat">
              {{ STAT_EMOJI.messages }} {{ pulse.messagesHandled }}
              {{ pluralize(pulse.messagesHandled, "message", "messages") }}
            </strong>
            in the last 7 days
          </li>
          <li>
            <template v-if="(upcomingBookingsCount ?? 0) === 0">
              <strong class="mc-stat">
                {{ STAT_EMOJI.bookings }} no upcoming bookings
              </strong>
              this week
            </template>
            <template v-else>
              <strong class="mc-stat">
                {{ STAT_EMOJI.bookings }} {{ upcomingBookingsCount }} upcoming
                {{
                  pluralize(upcomingBookingsCount ?? 0, "booking", "bookings")
                }}
              </strong>
              this week
            </template>
          </li>
        </ul>
      </template>
      <p v-else class="mc-text">
        Your ME3 site summary will appear here once your profile site is ready.
      </p>
    </div>

    <div class="card__foot mc-foot">
      <router-link to="/assistant" class="mc-cta">
        Manage
        <UiIcon name="ArrowRight" :size="14" class="mc-cta__icon" />
      </router-link>
    </div>
  </Card>
</template>

<style scoped>
.mc-body {
  flex: 1;
  gap: 10px;
}

.mc-text {
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.6;
}

.mc-text--lead {
  font-size: 15px;
}

.mc-bullets {
  margin: 0 0 12px;
  padding-left: 1.25em;
  list-style-type: disc;
}

.mc-bullets li {
  margin: 0.35em 0;
}

.mc-bullets li::marker {
  color: var(--color-text-muted);
}

.mc-stat {
  font-weight: 600;
}

.mc-foot {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

.mc-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.mc-cta :deep(.mc-cta__icon) {
  flex-shrink: 0;
  opacity: 0.85;
}

.mc-cta:hover {
  opacity: 0.75;
}
</style>
