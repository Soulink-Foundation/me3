import { defineStore } from "pinia";
import { ref } from "vue";
import { api, ApiError } from "../api";
import type { SupportedSocialPlatform } from "../utils/social-compose";

export type ContentItemStatus =
  | "bank"
  | "queued"
  | "scheduled"
  | "publishing"
  | "posted"
  | "failed"
  | "archived";

export type ContentMediaAsset = {
  url: string;
  filename?: string;
  mimeType?: string;
  kind?: "image" | "video";
  path?: string;
  assetIndex?: number;
};

export type ContentItem = {
  id: string;
  siteId: string;
  siteUsername: string;
  userId: string;
  body: string;
  mediaManifest: ContentMediaAsset[];
  platforms: SupportedSocialPlatform[];
  sourceType: "original" | "blog_extract" | "imported" | "reworked";
  sourceRef: string | null;
  status: ContentItemStatus;
  queuePosition: number | null;
  scheduledFor: string | null;
  timezone: string | null;
  createdBy: "human" | "agent_suggested";
  approvedByHuman: boolean;
  evergreen: boolean;
  timesPosted: number;
  lastPostedAt: string | null;
  cooldownDays: number;
  tags: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentStats = {
  bankCount: number;
  queuedCount: number;
  postedCount: number;
  nextScheduledAt: string | null;
};

export const useContentStore = defineStore("content", () => {
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function fetchItems(
    siteId: string,
    status?: ContentItemStatus,
  ): Promise<ContentItem[]> {
    error.value = null;
    const params = new URLSearchParams({ siteId });
    if (status) params.set("status", status);
    const data = await api.get<{ items: ContentItem[] }>(
      `/content/items?${params.toString()}`,
    );
    return data.items || [];
  }

  async function fetchStats(siteId: string): Promise<ContentStats | null> {
    error.value = null;
    const data = await api.get<{ stats: ContentStats }>(
      `/content/stats?siteId=${encodeURIComponent(siteId)}`,
    );
    return data.stats || null;
  }

  async function createItem(payload: {
    siteId: string;
    body: string;
    platforms: SupportedSocialPlatform[];
    mediaManifest?: ContentMediaAsset[];
    timezone?: string | null;
    notes?: string | null;
    evergreen?: boolean;
    tags?: string[];
  }): Promise<ContentItem> {
    error.value = null;
    const data = await api.post<{ item: ContentItem }>("/content/items", payload);
    if (!data.item) throw new Error("No content item returned");
    return data.item;
  }

  async function updateItem(
    itemId: string,
    payload: Partial<{
      body: string;
      platforms: SupportedSocialPlatform[];
      mediaManifest: ContentMediaAsset[];
      timezone: string | null;
      notes: string | null;
      evergreen: boolean;
      tags: string[];
      status: ContentItemStatus;
    }>,
  ): Promise<ContentItem> {
    error.value = null;
    const data = await api.put<{ item: ContentItem }>(
      `/content/items/${encodeURIComponent(itemId)}`,
      payload,
    );
    if (!data.item) throw new Error("No content item returned");
    return data.item;
  }

  async function deleteItem(itemId: string): Promise<void> {
    error.value = null;
    await api.delete(`/content/items/${encodeURIComponent(itemId)}`);
  }

  async function uploadItemMedia(
    itemId: string,
    file: Blob,
    assetIndex: number,
  ): Promise<{ asset: ContentMediaAsset; item: ContentItem }> {
    error.value = null;
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const uploadFile = new File([file], `content-${assetIndex}.${ext}`, {
      type: file.type,
    });
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("assetIndex", String(assetIndex));
    const data = await api.upload<{ asset: ContentMediaAsset; item: ContentItem }>(
      `/content/items/${encodeURIComponent(itemId)}/media`,
      formData,
    );
    return data;
  }

  async function publishItem(itemId: string): Promise<ContentItem> {
    error.value = null;
    const data = await api.post<{ item: ContentItem }>(
      `/content/items/${encodeURIComponent(itemId)}/publish`,
      {},
    );
    if (!data.item) throw new Error("No content item returned");
    return data.item;
  }

  async function queueItem(itemId: string): Promise<ContentItem> {
    error.value = null;
    const data = await api.post<{ item: ContentItem }>(
      `/content/items/${encodeURIComponent(itemId)}/queue`,
      {},
    );
    if (!data.item) throw new Error("No content item returned");
    return data.item;
  }

  async function unqueueItem(itemId: string): Promise<ContentItem> {
    error.value = null;
    const data = await api.post<{ item: ContentItem }>(
      `/content/items/${encodeURIComponent(itemId)}/unqueue`,
      {},
    );
    if (!data.item) throw new Error("No content item returned");
    return data.item;
  }

  async function reorderQueue(
    siteId: string,
    itemIds: string[],
  ): Promise<ContentItem[]> {
    error.value = null;
    const data = await api.put<{ items: ContentItem[] }>("/content/queue/reorder", {
      siteId,
      itemIds,
    });
    return data.items || [];
  }

  function setErrorFromApi(value: unknown, fallback: string) {
    if (value instanceof ApiError) {
      error.value = value.message;
    } else {
      error.value = fallback;
    }
  }

  return {
    error,
    loading,
    fetchItems,
    fetchStats,
    createItem,
    updateItem,
    deleteItem,
    uploadItemMedia,
    publishItem,
    queueItem,
    unqueueItem,
    reorderQueue,
    setErrorFromApi,
  };
});
