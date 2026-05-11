<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import UiIcon from "./UiIcon.vue";

type CarouselItem = {
  title: string;
  body: string;
  image?: string;
  imageId?: string;
  link?: string;
};

type CarouselImageResult = {
  id: string;
  dataUrl: string;
};

type CarouselImageProvider = {
  uploadFile: (file: File) => Promise<CarouselImageResult>;
  uploadRandom: () => Promise<CarouselImageResult>;
};

const CAROUSEL_IMAGE_PROVIDER_KEY = "tiptap-carousel-image-provider";

const props = defineProps<{
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
}>();

const TITLE_LIMIT = 60;
const BODY_LIMIT = 200;

const imageProvider = inject<CarouselImageProvider | null>(
  CAROUSEL_IMAGE_PROVIDER_KEY,
  null,
);

const uploadRefs = ref<Array<HTMLInputElement | null>>([]);
const loadingByIndex = ref<Record<number, boolean>>({});
const errorByIndex = ref<Record<number, string>>({});

const items = computed<CarouselItem[]>(() => {
  const raw = props.node?.attrs?.items;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    title: typeof item?.title === "string" ? item.title : "",
    body: typeof item?.body === "string" ? item.body : "",
    image: typeof item?.image === "string" ? item.image : "",
    imageId: typeof item?.imageId === "string" ? item.imageId : "",
    link: typeof item?.link === "string" ? item.link : "",
  }));
});

function updateItem(index: number, patch: Partial<CarouselItem>) {
  const next = items.value.map((item, i) =>
    i === index ? { ...item, ...patch } : item,
  );
  props.updateAttributes({ items: next });
}

function addItem() {
  props.updateAttributes({
    items: [
      ...items.value,
      { title: "", body: "", image: "", imageId: "", link: "" },
    ],
  });
}

function removeItem(index: number) {
  const next = items.value.filter((_, i) => i !== index);
  props.updateAttributes({ items: next });
}

function setUploadRef(el: HTMLInputElement | null, index: number) {
  uploadRefs.value[index] = el;
}

function triggerUpload(index: number) {
  uploadRefs.value[index]?.click();
}

function setLoading(index: number, value: boolean) {
  loadingByIndex.value = { ...loadingByIndex.value, [index]: value };
}

function setError(index: number, message: string) {
  errorByIndex.value = { ...errorByIndex.value, [index]: message };
}

function clearError(index: number) {
  if (!errorByIndex.value[index]) return;
  const next = { ...errorByIndex.value };
  delete next[index];
  errorByIndex.value = next;
}

async function handleFileChange(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!imageProvider) {
    setError(index, "Image uploads are not available here.");
    return;
  }

  clearError(index);
  setLoading(index, true);
  try {
    const uploaded = await imageProvider.uploadFile(file);
    updateItem(index, {
      image: uploaded.dataUrl,
      imageId: uploaded.id,
    });
  } catch (err) {
    setError(
      index,
      err instanceof Error ? err.message : "Failed to upload image.",
    );
  } finally {
    setLoading(index, false);
  }
}

async function handleRandomImage(index: number) {
  if (!imageProvider) {
    setError(index, "Random images are not available here.");
    return;
  }
  clearError(index);
  setLoading(index, true);
  try {
    const uploaded = await imageProvider.uploadRandom();
    updateItem(index, {
      image: uploaded.dataUrl,
      imageId: uploaded.id,
    });
  } catch (err) {
    setError(
      index,
      err instanceof Error ? err.message : "Failed to load random image.",
    );
  } finally {
    setLoading(index, false);
  }
}

function clearImage(index: number) {
  updateItem(index, { image: "", imageId: "" });
}
</script>

<template>
  <NodeViewWrapper class="tiptap-carousel-node" contenteditable="false">
    <div class="carousel-node-header">
      <div>
        <div class="carousel-node-title">Card carousel</div>
        <div class="carousel-node-subtitle">
          Swipeable cards with image, title, body, and link
        </div>
      </div>
      <button class="carousel-node-add" type="button" @click="addItem">
        <UiIcon name="Plus" :size="14" aria-hidden="true" />
        Add card
      </button>
    </div>

    <div v-if="items.length === 0" class="carousel-node-empty">
      No cards yet. Add your first card.
    </div>

    <div v-else class="carousel-node-items">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="carousel-node-item"
      >
        <div class="carousel-node-fields">
          <div class="carousel-node-image">
            <div class="carousel-image-preview">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="item.title || 'Carousel image'"
              />
              <div v-else class="carousel-image-empty">No image</div>
            </div>
            <div class="carousel-image-actions">
              <input
                :ref="(el) => setUploadRef(el as HTMLInputElement | null, index)"
                class="carousel-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                @change="handleFileChange(index, $event)"
              />
              <button
                class="carousel-image-btn"
                type="button"
                :disabled="loadingByIndex[index] || !imageProvider"
                @click="triggerUpload(index)"
              >
                <UiIcon name="Image" :size="14" aria-hidden="true" />
                Upload
              </button>
              <button
                class="carousel-image-btn"
                type="button"
                :disabled="loadingByIndex[index] || !imageProvider"
                @click="handleRandomImage(index)"
              >
                <UiIcon name="Shuffle" :size="14" aria-hidden="true" />
                Random
              </button>
              <button
                v-if="item.image"
                class="carousel-image-btn ghost"
                type="button"
                :disabled="loadingByIndex[index]"
                @click="clearImage(index)"
              >
                Remove
              </button>
            </div>
            <p v-if="errorByIndex[index]" class="carousel-image-error">
              {{ errorByIndex[index] }}
            </p>
          </div>

          <label class="carousel-node-label">
            Title
            <span class="carousel-node-count"
              >{{ (item.title || "").length }}/{{ TITLE_LIMIT }}</span
            >
          </label>
          <input
            class="carousel-node-input"
            type="text"
            :maxlength="TITLE_LIMIT"
            :value="item.title"
            placeholder="Highlight the key idea"
            @input="
              updateItem(index, {
                title: ((
                  $event.target as HTMLInputElement
                ).value || '').slice(0, TITLE_LIMIT),
              })
            "
          />

          <label class="carousel-node-label">
            Body
            <span class="carousel-node-count"
              >{{ (item.body || '').length }}/{{ BODY_LIMIT }}</span
            >
          </label>
          <textarea
            class="carousel-node-textarea"
            rows="3"
            :value="item.body"
            placeholder="Keep this short and scannable."
            @input="
              updateItem(index, {
                body: ((
                  $event.target as HTMLTextAreaElement
                ).value || '').slice(0, BODY_LIMIT),
              })
            "
          ></textarea>

          <label class="carousel-node-label">Link (optional)</label>
          <input
            class="carousel-node-input"
            type="text"
            :value="item.link"
            placeholder="https://example.com"
            @input="
              updateItem(index, {
                link: ($event.target as HTMLInputElement).value || '',
              })
            "
          />
        </div>
        <button
          class="carousel-node-remove"
          type="button"
          title="Remove card"
          @click="removeItem(index)"
        >
          <UiIcon name="Trash2" :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.tiptap-carousel-node {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.carousel-node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.carousel-node-title {
  font-weight: 600;
  font-size: 15px;
}

.carousel-node-subtitle {
  color: var(--color-text-muted);
  font-size: 12px;
}

.carousel-node-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: var(--color-text);
  color: var(--color-bg);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  cursor: pointer;
}

.carousel-node-empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

.carousel-node-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.carousel-node-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg);
}

.carousel-node-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carousel-node-image {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.carousel-image-preview {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-bg);
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-image-preview img {
  width: 100%;
  display: block;
  object-fit: cover;
  max-height: 200px;
}

.carousel-image-empty {
  font-size: 12px;
  color: var(--color-text-muted);
}

.carousel-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.carousel-image-input {
  display: none;
}

.carousel-image-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.carousel-image-btn.ghost {
  border-color: transparent;
  color: var(--color-text-muted);
}

.carousel-image-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.carousel-image-error {
  color: #ef4444;
  font-size: 12px;
}

.carousel-node-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.carousel-node-count {
  font-weight: 500;
}

.carousel-node-input,
.carousel-node-textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}

.carousel-node-textarea {
  resize: vertical;
}

.carousel-node-remove {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.carousel-node-remove:hover {
  color: #ef4444;
}
</style>
