import { ref } from "vue";
import { ApiError, api } from "../api";

type RelationshipsResponse = {
  summary?: {
    pending: number;
  };
};

const pendingRelationshipCount = ref<number | null>(null);
const loadingRelationshipCount = ref(false);

let pendingRequest: Promise<void> | null = null;

async function loadRelationshipSuggestionCount(force = false): Promise<void> {
  if (pendingRequest) {
    return pendingRequest;
  }

  if (!force && pendingRelationshipCount.value !== null) {
    return;
  }

  loadingRelationshipCount.value = true;
  pendingRequest = (async () => {
    try {
      const data = await api.get<RelationshipsResponse>("/agent/relationships?limit=1");
      pendingRelationshipCount.value = data.summary?.pending ?? 0;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        pendingRelationshipCount.value = null;
        return;
      }

      pendingRelationshipCount.value = null;
    } finally {
      loadingRelationshipCount.value = false;
      pendingRequest = null;
    }
  })();

  return pendingRequest;
}

export function useRelationshipSuggestionCount() {
  return {
    pendingRelationshipCount,
    loadingRelationshipCount,
    loadRelationshipSuggestionCount,
    refreshRelationshipSuggestionCount: () => loadRelationshipSuggestionCount(true),
  };
}
