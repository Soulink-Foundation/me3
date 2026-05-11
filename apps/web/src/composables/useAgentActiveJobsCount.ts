import { ref } from "vue";
import { ApiError, api } from "../api";

type JobsResponse = {
  jobs: unknown[];
  limit: number;
  enabledCount: number;
};

const activeJobsCount = ref<number | null>(null);
const loadingActiveJobsCount = ref(false);

let pendingRequest: Promise<void> | null = null;

async function loadAgentActiveJobsCount(force = false): Promise<void> {
  if (pendingRequest) {
    return pendingRequest;
  }

  if (!force && activeJobsCount.value !== null) {
    return;
  }

  loadingActiveJobsCount.value = true;
  pendingRequest = (async () => {
    try {
      const data = await api.get<JobsResponse>("/agent/jobs");
      activeJobsCount.value = Math.max(0, data.enabledCount ?? 0);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 403 || err.status === 404)
      ) {
        activeJobsCount.value = null;
        return;
      }

      activeJobsCount.value = null;
    } finally {
      loadingActiveJobsCount.value = false;
      pendingRequest = null;
    }
  })();

  return pendingRequest;
}

export function useAgentActiveJobsCount() {
  return {
    activeJobsCount,
    loadingActiveJobsCount,
    loadAgentActiveJobsCount,
    refreshAgentActiveJobsCount: () => loadAgentActiveJobsCount(true),
  };
}
