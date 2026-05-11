import { ref } from "vue";
import { ApiError, api } from "../api";

type MessagesResponse = {
  total: number;
};

const draftCount = ref<number | null>(null);
const loadingDraftCount = ref(false);

let pendingRequest: Promise<void> | null = null;

async function loadInboxDraftCount(force = false): Promise<void> {
  if (pendingRequest) {
    return pendingRequest;
  }

  if (!force && draftCount.value !== null) {
    return;
  }

  loadingDraftCount.value = true;
  pendingRequest = (async () => {
    try {
      const data = await api.get<MessagesResponse>(
        "/mailbox/messages?folder=drafts&status=pending_approval&direction=outbound&limit=0",
      );
      draftCount.value = data.total;
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 403 || err.status === 404)
      ) {
        draftCount.value = null;
        return;
      }

      draftCount.value = null;
    } finally {
      loadingDraftCount.value = false;
      pendingRequest = null;
    }
  })();

  return pendingRequest;
}

function setInboxDraftCount(nextCount: number | null): void {
  draftCount.value = nextCount === null ? null : Math.max(0, nextCount);
}

export function useInboxDraftCount() {
  return {
    draftCount,
    loadingDraftCount,
    loadInboxDraftCount,
    refreshInboxDraftCount: () => loadInboxDraftCount(true),
    setInboxDraftCount,
  };
}
