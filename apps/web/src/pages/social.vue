<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import Card from "../components/Card.vue";
import SocialPostPreviewRail from "../components/SocialPostPreviewRail.vue";
import SocialAccountsPanel from "../components/SocialAccountsPanel.vue";
import ContentQuickCompose from "../components/content/ContentQuickCompose.vue";
import ContentTable from "../components/content/ContentTable.vue";
import { useSitesStore } from "../stores/sites";
import { useSocialStore, type SocialAccountRow } from "../stores/social";
import {
  useContentStore,
  type ContentItem,
  type ContentMediaAsset,
} from "../stores/content";
import {
  getSocialBlockingIssues,
  type SupportedSocialPlatform,
} from "../utils/social-compose";

definePage({
  meta: {
    requiresAuth: true,
    requiresWorkspace: true,
    title: "Social Publishing | ME3",
    description:
      "Write, bank, queue, and publish your standalone social content.",
    robots: "noindex,follow",
  },
});

type DraftState = {
  id: string | null;
  body: string;
  platforms: SupportedSocialPlatform[];
  mediaManifest: ContentMediaAsset[];
};

type PendingFile = {
  file: File;
  previewUrl: string;
};

type ContentTab = "compose" | "bank" | "posted" | "queue";

const sites = useSitesStore();
const social = useSocialStore();
const content = useContentStore();

const selectedSiteId = ref("");
const items = ref<ContentItem[]>([]);
const accounts = ref<SocialAccountRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const saveMode = ref<"bank" | "publish" | null>(null);
const busyItemId = ref<string | null>(null);
const reorderingQueue = ref(false);
const error = ref("");
const notice = ref("");
const activeTab = ref<ContentTab>("compose");
const siteProfile = ref({
  name: "",
  handle: "",
  avatar: null as string | null,
  bio: "",
});
const draft = ref<DraftState>({
  id: null,
  body: "",
  platforms: [],
  mediaManifest: [],
});
const pendingFiles = ref<PendingFile[]>([]);

const previewState = {
  title: "Content draft",
  slug: "_content-preview",
  type: "social" as const,
  excerpt: "",
  content: "",
  mediaUrl: null,
  mediaThumbnail: null,
};

const currentSite = computed(
  () => sites.sites.find((site) => site.id === selectedSiteId.value) || null,
);

const selectedSiteAccounts = computed(() =>
  accounts.value.filter((account) => account.siteId === selectedSiteId.value),
);

const instagramOptionId = computed<SupportedSocialPlatform>(() => {
  if (
    draft.value.platforms.includes("instagram_business") ||
    selectedSiteAccounts.value.some(
      (account) => account.platform === "instagram_business",
    )
  ) {
    return "instagram_business";
  }
  return "instagram";
});

const platformOptions = computed<
  Array<{
    id: SupportedSocialPlatform;
    label: string;
    connected: boolean;
  }>
>(() => {
  const connected = new Set(
    selectedSiteAccounts.value.map(
      (account) => account.platform as SupportedSocialPlatform,
    ),
  );

  return [
    { id: "x", label: "X", connected: connected.has("x") },
    {
      id: "linkedin",
      label: "LinkedIn",
      connected: connected.has("linkedin"),
    },
    {
      id: instagramOptionId.value,
      label: "Instagram",
      connected:
        connected.has("instagram") || connected.has("instagram_business"),
    },
  ];
});

const composeMediaManifest = computed<ContentMediaAsset[]>(() => [
  ...draft.value.mediaManifest,
  ...pendingFiles.value.map((entry, index) => ({
    url: entry.previewUrl,
    filename: entry.file.name,
    mimeType: entry.file.type,
    kind: "image" as const,
    assetIndex: draft.value.mediaManifest.length + index + 1,
  })),
]);

const previewAccounts = computed<SocialAccountRow[]>(() =>
  draft.value.platforms.map((platform) => {
    const actual =
      selectedSiteAccounts.value.find(
        (account) => account.platform === platform,
      ) ||
      (platform === "instagram" || platform === "instagram_business"
        ? selectedSiteAccounts.value.find(
            (account) =>
              account.platform === "instagram" ||
              account.platform === "instagram_business",
          )
        : null);
    if (actual) return actual;
    return {
      id: `preview-${platform}`,
      siteId: selectedSiteId.value,
      platform,
      handle: siteProfile.value.handle || currentSite.value?.username || "me3",
      displayName:
        siteProfile.value.name || currentSite.value?.username || "me3",
      status: "preview",
      lastVerifiedAt: null,
    };
  }),
);

const draftIssues = computed(() =>
  getSocialBlockingIssues({
    caption: draft.value.body,
    platforms: draft.value.platforms,
    hasUsableImages: composeMediaManifest.value.length > 0,
  }),
);

const canSubmit = computed(
  () =>
    !!selectedSiteId.value &&
    draft.value.body.trim().length > 0 &&
    draft.value.platforms.length > 0 &&
    draftIssues.value.length === 0,
);

function updateDraftBody(value: string) {
  draft.value = {
    ...draft.value,
    body: value,
  };
}

function byNewest(a: ContentItem, b: ContentItem): number {
  return Date.parse(b.updatedAt || "") - Date.parse(a.updatedAt || "");
}

function byQueueOrder(a: ContentItem, b: ContentItem): number {
  const aPublishing = a.status === "publishing";
  const bPublishing = b.status === "publishing";
  if (aPublishing !== bPublishing) return aPublishing ? 1 : -1;

  if (!aPublishing && !bPublishing) {
    return (
      (a.queuePosition || Number.MAX_SAFE_INTEGER) -
      (b.queuePosition || Number.MAX_SAFE_INTEGER)
    );
  }

  return byNewest(a, b);
}

const bankItems = computed(() =>
  items.value
    .filter((item) => item.status === "bank" || item.status === "failed")
    .sort(byNewest),
);
const postedItems = computed(() =>
  items.value
    .filter((item) => item.status === "posted")
    .sort(
      (a, b) =>
        Date.parse(b.lastPostedAt || "") - Date.parse(a.lastPostedAt || ""),
    ),
);
const queueItems = computed(() =>
  items.value
    .filter(
      (item) =>
        item.status === "queued" ||
        item.status === "scheduled" ||
        item.status === "publishing",
    )
    .sort(byQueueOrder),
);

/* Tab badges follow the loaded items list so counts stay in sync (stats can lag the items API). */
const bankCount = computed(() => bankItems.value.length);
const queuedCount = computed(() => queueItems.value.length);
const postedCount = computed(() => postedItems.value.length);

const visibleItems = computed(() => {
  if (activeTab.value === "posted") return postedItems.value;
  if (activeTab.value === "queue") return queueItems.value;
  return bankItems.value;
});

const previewPost = computed(() => ({
  ...previewState,
  caption: draft.value.body,
  images: composeMediaManifest.value.map((asset) => asset.url),
}));

function resetDraft() {
  for (const entry of pendingFiles.value) {
    URL.revokeObjectURL(entry.previewUrl);
  }
  pendingFiles.value = [];
  draft.value = {
    id: null,
    body: "",
    platforms: [],
    mediaManifest: [],
  };
}

function upsertContentItem(item: ContentItem) {
  const rest = items.value.filter((row) => row.id !== item.id);
  items.value = [item, ...rest];
}

function setDefaultSiteIfNeeded() {
  if (!selectedSiteId.value && sites.sites.length > 0) {
    selectedSiteId.value = sites.sites[0].id;
  }
}

async function loadSiteProfile() {
  const fallbackName = currentSite.value?.username || "me3";

  if (!currentSite.value) {
    siteProfile.value = {
      name: "",
      handle: "",
      avatar: null,
      bio: "",
    };
    return;
  }

  siteProfile.value = {
    name: fallbackName,
    handle: currentSite.value.username,
    avatar: null,
    bio: "",
  };

  try {
    if (currentSite.value.site_type === "landing_page") {
      const draftResult = await sites.getLandingPageDraft(
        currentSite.value.username,
      );
      siteProfile.value = {
        name: draftResult?.profile?.name || fallbackName,
        handle: currentSite.value.username,
        avatar: draftResult?.profile?.avatar || null,
        bio: draftResult?.profile?.bio || "",
      };
      return;
    }

    const contentResult = await sites.getSiteContent(
      currentSite.value.username,
    );
    siteProfile.value = {
      name: contentResult?.profile?.name || fallbackName,
      handle: currentSite.value.username,
      avatar: contentResult?.profile?.avatar || null,
      bio: contentResult?.profile?.bio || "",
    };
  } catch (value) {
    console.warn("Failed to load content profile summary:", value);
  }
}

async function loadContentData() {
  if (!selectedSiteId.value) {
    items.value = [];
    return;
  }

  loading.value = true;
  error.value = "";
  try {
    const [nextItems, nextAccounts] = await Promise.all([
      content.fetchItems(selectedSiteId.value),
      social.fetchSocialAccounts(),
    ]);
    await loadSiteProfile();
    items.value = nextItems;
    accounts.value = nextAccounts;
  } catch (value) {
    content.setErrorFromApi(value, "Failed to load content");
    error.value = content.error || social.error || "Failed to load content";
  } finally {
    loading.value = false;
  }
}

function togglePlatform(platform: SupportedSocialPlatform) {
  notice.value = "";
  error.value = "";
  const current = new Set(draft.value.platforms);
  if (current.has(platform)) current.delete(platform);
  else current.add(platform);
  draft.value = {
    ...draft.value,
    platforms: Array.from(current),
  };
}

async function addFiles(files: File[]) {
  if (files.length === 0) return;
  error.value = "";

  if (draft.value.id) {
    saving.value = true;
    try {
      let latestItem: ContentItem | null = null;
      for (const [index, file] of files.entries()) {
        const result = await content.uploadItemMedia(
          draft.value.id,
          file,
          draft.value.mediaManifest.length + index + 1,
        );
        latestItem = result.item;
      }
      if (latestItem) {
        draft.value = {
          id: latestItem.id,
          body: latestItem.body,
          platforms: latestItem.platforms,
          mediaManifest: latestItem.mediaManifest,
        };
        items.value = items.value.map((item) =>
          item.id === latestItem?.id ? latestItem : item,
        );
      }
    } catch (value) {
      content.setErrorFromApi(value, "Failed to upload image");
      error.value = content.error || "Failed to upload image";
    } finally {
      saving.value = false;
    }
    return;
  }

  for (const file of files) {
    pendingFiles.value.push({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }
}

function removeMedia(index: number) {
  if (index < draft.value.mediaManifest.length) {
    draft.value = {
      ...draft.value,
      mediaManifest: draft.value.mediaManifest.filter((_, i) => i !== index),
    };
    return;
  }

  const pendingIndex = index - draft.value.mediaManifest.length;
  const entry = pendingFiles.value[pendingIndex];
  if (!entry) return;
  URL.revokeObjectURL(entry.previewUrl);
  pendingFiles.value.splice(pendingIndex, 1);
}

function getPostPublishNotice(status: ContentItem["status"]): string {
  if (status === "posted") return "Content item posted.";
  if (status === "publishing") return "Content item sent to the publish queue.";
  if (status === "queued" || status === "scheduled") {
    return "Content item added to your queue.";
  }
  return "Content item updated.";
}

function getPostPublishTab(status: ContentItem["status"]): ContentTab {
  if (
    status === "queued" ||
    status === "scheduled" ||
    status === "publishing"
  ) {
    return "queue";
  }
  return "posted";
}

async function saveDraft(publishNow = false) {
  if (!canSubmit.value || !selectedSiteId.value) return;
  saving.value = true;
  saveMode.value = publishNow ? "publish" : "bank";
  error.value = "";
  notice.value = "";
  const wasEditing = !!draft.value.id;

  try {
    let item: ContentItem;
    if (draft.value.id) {
      item = await content.updateItem(draft.value.id, {
        body: draft.value.body,
        platforms: draft.value.platforms,
        mediaManifest: draft.value.mediaManifest,
      });
    } else {
      item = await content.createItem({
        siteId: selectedSiteId.value,
        body: draft.value.body,
        platforms: draft.value.platforms,
      });
      draft.value = {
        id: item.id,
        body: item.body,
        platforms: item.platforms,
        mediaManifest: item.mediaManifest,
      };
    }

    while (pendingFiles.value.length > 0) {
      const [entry] = pendingFiles.value;
      if (!entry) break;
      const result = await content.uploadItemMedia(
        item.id,
        entry.file,
        item.mediaManifest.length + 1,
      );
      URL.revokeObjectURL(entry.previewUrl);
      pendingFiles.value.shift();
      item = result.item;
      draft.value = {
        id: item.id,
        body: item.body,
        platforms: item.platforms,
        mediaManifest: item.mediaManifest,
      };
    }

    if (publishNow) {
      item = await content.publishItem(item.id);
      notice.value = getPostPublishNotice(item.status);
    } else {
      notice.value = wasEditing
        ? "Content item updated."
        : "Added to your content bank.";
    }

    upsertContentItem(item);
    resetDraft();
    await loadContentData();
    activeTab.value = publishNow ? getPostPublishTab(item.status) : "bank";
  } catch (value) {
    content.setErrorFromApi(value, "Failed to save content item");
    error.value = content.error || "Failed to save content item";
  } finally {
    saving.value = false;
    saveMode.value = null;
  }
}

function startEditing(item: ContentItem) {
  resetDraft();
  draft.value = {
    id: item.id,
    body: item.body,
    platforms: [...item.platforms],
    mediaManifest: [...item.mediaManifest],
  };
  activeTab.value = "compose";
  notice.value = "";
  error.value = "";
}

async function publishItem(item: ContentItem) {
  busyItemId.value = item.id;
  error.value = "";
  notice.value = "";
  try {
    const updatedItem = await content.publishItem(item.id);
    if (draft.value.id === item.id) {
      resetDraft();
    }
    notice.value = getPostPublishNotice(updatedItem.status);
    await loadContentData();
    activeTab.value = getPostPublishTab(updatedItem.status);
  } catch (value) {
    content.setErrorFromApi(value, "Failed to publish content item");
    error.value = content.error || "Failed to publish content item";
  } finally {
    busyItemId.value = null;
  }
}

async function queueItem(item: ContentItem) {
  busyItemId.value = item.id;
  error.value = "";
  notice.value = "";
  try {
    const updatedItem = await content.queueItem(item.id);
    if (draft.value.id === item.id) {
      draft.value = {
        id: updatedItem.id,
        body: updatedItem.body,
        platforms: updatedItem.platforms,
        mediaManifest: updatedItem.mediaManifest,
      };
    }
    notice.value = "Content item added to your queue.";
    await loadContentData();
    activeTab.value = "queue";
  } catch (value) {
    content.setErrorFromApi(value, "Failed to queue content item");
    error.value = content.error || "Failed to queue content item";
  } finally {
    busyItemId.value = null;
  }
}

async function unqueueItem(item: ContentItem) {
  busyItemId.value = item.id;
  error.value = "";
  notice.value = "";
  try {
    const updatedItem = await content.unqueueItem(item.id);
    if (draft.value.id === item.id) {
      draft.value = {
        id: updatedItem.id,
        body: updatedItem.body,
        platforms: updatedItem.platforms,
        mediaManifest: updatedItem.mediaManifest,
      };
    }
    notice.value = "Content item moved back to your bank.";
    await loadContentData();
    activeTab.value = "bank";
  } catch (value) {
    content.setErrorFromApi(value, "Failed to move content item back to bank");
    error.value = content.error || "Failed to move content item back to bank";
  } finally {
    busyItemId.value = null;
  }
}

async function reorderQueue(nextQueueIds: string[]) {
  if (!selectedSiteId.value || nextQueueIds.length === 0) return;
  reorderingQueue.value = true;
  error.value = "";
  notice.value = "";
  try {
    items.value = await content.reorderQueue(
      selectedSiteId.value,
      nextQueueIds,
    );
    notice.value = "Queue order updated.";
  } catch (value) {
    content.setErrorFromApi(value, "Failed to reorder queue");
    error.value = content.error || "Failed to reorder queue";
    await loadContentData();
  } finally {
    reorderingQueue.value = false;
  }
}

async function removeItem(item: ContentItem) {
  if (!window.confirm("Delete this content item?")) return;
  busyItemId.value = item.id;
  error.value = "";
  notice.value = "";
  try {
    await content.deleteItem(item.id);
    if (draft.value.id === item.id) {
      resetDraft();
    }
    notice.value = "Content item deleted.";
    await loadContentData();
  } catch (value) {
    content.setErrorFromApi(value, "Failed to delete content item");
    error.value = content.error || "Failed to delete content item";
  } finally {
    busyItemId.value = null;
  }
}

watch(
  () => sites.sites,
  () => {
    setDefaultSiteIfNeeded();
  },
  { deep: true },
);

watch(selectedSiteId, async () => {
  resetDraft();
  await loadContentData();
});

onMounted(async () => {
  if (sites.sites.length === 0) {
    await sites.fetchSites();
  }
  setDefaultSiteIfNeeded();
  if (selectedSiteId.value) {
    await loadContentData();
  }
});

onBeforeUnmount(() => {
  resetDraft();
});
</script>

<template>
  <div class="content-page">
    <Teleport to="#app-side-nav-mobile-page-controls">
      <div
        v-if="currentSite"
        class="content-mobile-tabs"
        role="tablist"
        aria-label="Content views"
      >
        <button
          type="button"
          class="content-mobile-tab"
          role="tab"
          :class="{ 'is-on': activeTab === 'compose' }"
          :aria-selected="activeTab === 'compose'"
          @click="activeTab = 'compose'"
        >
          Compose
        </button>
        <button
          type="button"
          class="content-mobile-tab"
          role="tab"
          :class="{ 'is-on': activeTab === 'bank' }"
          :aria-selected="activeTab === 'bank'"
          @click="activeTab = 'bank'"
        >
          Bank {{ bankCount }}
        </button>
        <button
          type="button"
          class="content-mobile-tab"
          role="tab"
          :class="{ 'is-on': activeTab === 'queue' }"
          :aria-selected="activeTab === 'queue'"
          @click="activeTab = 'queue'"
        >
          Queue {{ queuedCount }}
        </button>
        <button
          type="button"
          class="content-mobile-tab"
          role="tab"
          :class="{ 'is-on': activeTab === 'posted' }"
          :aria-selected="activeTab === 'posted'"
          @click="activeTab = 'posted'"
        >
          Posted {{ postedCount }}
        </button>
      </div>
    </Teleport>

    <main class="content-layout">
      <div v-if="error" class="banner banner-error" role="alert">
        {{ error }}
      </div>
      <div v-if="notice" class="banner banner-info" role="status">
        {{ notice }}
      </div>

      <div v-if="sites.sites.length === 0" class="empty-shell">
        Create a site first, then your content bank can live alongside it.
      </div>

      <template v-else-if="currentSite">
        <div class="tab-bar" role="tablist" aria-label="Content views">
          <button
            type="button"
            class="tab-btn"
            role="tab"
            :class="{ 'tab-btn--active': activeTab === 'compose' }"
            :aria-selected="activeTab === 'compose'"
            @click="activeTab = 'compose'"
          >
            Quick Compose
          </button>
          <button
            type="button"
            class="tab-btn"
            role="tab"
            :class="{ 'tab-btn--active': activeTab === 'bank' }"
            :aria-selected="activeTab === 'bank'"
            @click="activeTab = 'bank'"
          >
            Bank
            <span class="tab-count">{{ bankCount }}</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            role="tab"
            :class="{ 'tab-btn--active': activeTab === 'queue' }"
            :aria-selected="activeTab === 'queue'"
            @click="activeTab = 'queue'"
          >
            Queue
            <span class="tab-count">{{ queuedCount }}</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            role="tab"
            :class="{ 'tab-btn--active': activeTab === 'posted' }"
            :aria-selected="activeTab === 'posted'"
            @click="activeTab = 'posted'"
          >
            Posted
            <span class="tab-count">{{ postedCount }}</span>
          </button>
        </div>

        <section v-if="activeTab === 'compose'" class="content-grid">
          <Card class="compose-card">
            <ContentQuickCompose
              :body="draft.body"
              :selected-platforms="draft.platforms"
              :platform-options="platformOptions"
              :issues="draftIssues"
              :media-manifest="composeMediaManifest"
              :profile="siteProfile"
              :saving="saving"
              :save-mode="saveMode"
              :can-submit="canSubmit"
              :is-editing="!!draft.id"
              @update:body="updateDraftBody"
              @toggle-platform="togglePlatform"
              @files-selected="addFiles"
              @remove-media="removeMedia"
              @submit="saveDraft(false)"
              @submit-now="saveDraft(true)"
              @cancel="resetDraft"
            />
          </Card>

          <div class="side-stack">
            <Card>
              <div class="card__head">
                <h2 class="card__title">Preview</h2>
              </div>
              <div class="card__body preview-shell">
                <div v-if="draft.platforms.length === 0" class="preview-empty">
                  Select at least one platform to preview this post.
                </div>
                <SocialPostPreviewRail
                  v-else
                  :profile="siteProfile"
                  :post="previewPost"
                  :connected-accounts="previewAccounts"
                  :selected-platforms="draft.platforms"
                />
              </div>
            </Card>

            <Card>
              <SocialAccountsPanel :site-id="currentSite.id" />
            </Card>
          </div>
        </section>

        <Card v-else>
          <ContentTable
            :title="
              activeTab === 'posted'
                ? 'Posted history'
                : activeTab === 'queue'
                  ? 'Queue'
                  : 'Content bank'
            "
            :items="visibleItems"
            :mode="activeTab"
            :busy-item-id="busyItemId"
            :reordering="reorderingQueue"
            @edit="startEditing"
            @queue="queueItem"
            @unqueue="unqueueItem"
            @reorder="reorderQueue"
            @publish="publishItem"
            @delete="removeItem"
          />
        </Card>
      </template>

      <div v-if="loading" class="loading-state">Loading content…</div>
    </main>
  </div>
</template>

<style scoped>
.content-layout {
  margin: 0 auto;
  padding: 24px 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(360px, 1.45fr) minmax(320px, 1fr);
  gap: 20px;
  align-items: start;
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.banner {
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
}

.banner-error {
  border-color: var(--color-text);
}

.banner-info {
  color: var(--color-text-muted);
}

.empty-shell,
.loading-state {
  color: var(--color-text-muted);
  font-size: 14px;
}

.tab-bar {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s,
    border-color 0.12s;
}

.tab-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text);
}

.tab-btn--active {
  background: var(--color-text);
  color: var(--color-bg);
  border-color: var(--color-text);
}

.tab-btn--active:hover {
  color: var(--color-bg);
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: var(--color-bg);
  color: var(--color-text);
}

.tab-btn--active .tab-count {
  background: var(--color-text-muted);
  color: var(--color-bg);
}

.content-mobile-tabs {
  display: none;
}

.preview-shell {
  min-height: 260px;
}

.preview-empty {
  color: var(--color-text-muted);
  font-size: 14px;
}

@media (max-width: 960px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .content-layout {
    padding: 16px;
  }

  .tab-bar {
    display: none;
  }

  .content-mobile-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: center;
    gap: 4px;
    width: 100%;
    min-width: 0;
  }

  .content-mobile-tab {
    min-width: 0;
    height: 36px;
    padding: 0 6px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg);
    color: var(--color-text-muted);
    font: inherit;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .content-mobile-tab.is-on {
    border-color: var(--color-text);
    background: var(--color-text);
    color: var(--color-bg);
  }

  .compose-card {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
}
</style>
