import { defineStore } from "pinia";
import { ref } from "vue";
import { api, ApiError } from "../api";

export type SocialAccountRow = {
  id: string;
  siteId: string;
  platform: string;
  handle: string | null;
  displayName: string | null;
  status: string;
  lastVerifiedAt: string | null;
};

export const useSocialStore = defineStore("social", () => {
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function fetchSocialAccounts(): Promise<SocialAccountRow[]> {
    error.value = null;
    const data = await api.get<{ accounts: SocialAccountRow[] }>(
      "/social/accounts",
    );
    return data.accounts || [];
  }

  async function startSocialOAuth(
    platform:
      | "x"
      | "linkedin"
      | "instagram"
      | "instagram_business"
      | "youtube",
    siteId: string,
    returnPath?: string,
  ): Promise<string> {
    error.value = null;
    const data = await api.post<{ url: string }>(
      `/social/${platform}/authorize`,
      { siteId, returnPath: returnPath || null },
    );
    if (!data.url) throw new Error("No OAuth URL");
    return data.url;
  }

  async function disconnectSocialAccount(accountId: string): Promise<void> {
    error.value = null;
    await api.delete(`/social/accounts/${encodeURIComponent(accountId)}`);
  }

  function setErrorFromApi(e: unknown, fallback: string) {
    if (e instanceof ApiError) {
      error.value = e.message;
    } else {
      error.value = fallback;
    }
  }

  return {
    error,
    loading,
    fetchSocialAccounts,
    startSocialOAuth,
    disconnectSocialAccount,
    setErrorFromApi,
  };
});
