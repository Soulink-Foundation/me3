<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = defineProps<{
  name: string;
  handle?: string;
  avatar?: string;
  quote: string;
  profileUrl?: string;
  meJsonUrl?: string;
}>();

/** Hide broken remote/file URLs and show initials instead of alt text in the circle. */
const avatarLoadFailed = ref(false);
watch(
  () => props.avatar,
  () => {
    avatarLoadFailed.value = false;
  },
);

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.charAt(0) || "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
});

const showModal = ref(false);
const shouldShowMore = computed(() => props.quote.trim().length > 300);

function closeModal() {
  showModal.value = false;
}
</script>

<template>
  <article class="testimonial-card">
    <header class="testimonial-header">
      <img
        v-if="avatar && !avatarLoadFailed"
        class="testimonial-avatar"
        :src="avatar"
        alt=""
        @error="avatarLoadFailed = true"
      />
      <div v-else class="testimonial-avatar placeholder" aria-hidden="true">
        <span>{{ initials }}</span>
      </div>
      <div class="testimonial-meta">
        <p class="testimonial-name">{{ name }}</p>
        <p v-if="handle" class="testimonial-handle">@{{ handle }}</p>
      </div>
      <a
        v-if="profileUrl"
        class="testimonial-link"
        :href="profileUrl"
        target="_blank"
        rel="noopener"
      >
        View site
      </a>
    </header>
    <p class="testimonial-quote" :class="{ clamped: shouldShowMore }">
      “{{ quote }}”
    </p>
    <!-- <button
      v-if="shouldShowMore"
      class="testimonial-more"
      type="button"
      @click="showModal = true"
    >
      Read full
    </button>
    <footer v-if="meJsonUrl" class="testimonial-footer">
      Built from
      <a :href="meJsonUrl" target="_blank" rel="noopener">me.json</a>
    </footer> -->
  </article>
  <teleport to="body">
    <div v-if="showModal" class="testimonial-modal" @click.self="closeModal">
      <div class="testimonial-modal-card" role="dialog" aria-modal="true">
        <button
          class="testimonial-modal-close"
          type="button"
          @click="closeModal"
        >
          Close
        </button>
        <div class="testimonial-modal-header">
          <img
            v-if="avatar && !avatarLoadFailed"
            class="testimonial-avatar"
            :src="avatar"
            alt=""
            @error="avatarLoadFailed = true"
          />
          <div v-else class="testimonial-avatar placeholder" aria-hidden="true">
            <span>{{ initials }}</span>
          </div>
          <div class="testimonial-meta">
            <p class="testimonial-name">{{ name }}</p>
            <p v-if="handle" class="testimonial-handle">@{{ handle }}</p>
          </div>
        </div>
        <p class="testimonial-quote full">“{{ quote }}”</p>
        <a
          v-if="profileUrl"
          class="testimonial-link"
          :href="profileUrl"
          target="_blank"
          rel="noopener"
        >
          View site
        </a>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.testimonial-card {
  border: 1px solid var(--color-border, #e5e5e5);
  border-radius: 18px;
  background: var(--color-bg, #fff);
  color: var(--color-text, #111);
  padding: 24px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.05);
  max-width: 520px;
  margin: 0 auto;
}

.testimonial-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.testimonial-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border);
}

.testimonial-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border);
  color: var(--color-text);
  font-weight: 600;
  font-size: 16px;
}

.testimonial-meta {
  flex: 1;
}

.testimonial-name {
  font-weight: 600;
  font-size: 16px;
}

.testimonial-handle {
  color: var(--color-text-muted);
  font-size: 14px;
}

.testimonial-link {
  font-weight: 600;
  font-size: 14px;
  text-decoration: underline;
  color: inherit;
}

.testimonial-quote {
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 16px;
}

.testimonial-quote.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.testimonial-quote.full {
  margin-bottom: 12px;
}

.testimonial-more {
  border: none;
  background: transparent;
  padding: 0;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text, #111);
  text-decoration: underline;
  cursor: pointer;
  margin-bottom: 8px;
}

.testimonial-footer {
  font-size: 13px;
  color: var(--color-text-muted);
}

.testimonial-modal {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 50;
}

.testimonial-modal-card {
  background: var(--color-bg, #fff);
  color: var(--color-text, #111);
  border-radius: 18px;
  border: 1px solid var(--color-border, #e5e5e5);
  padding: 24px;
  width: min(92vw, 640px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.testimonial-modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.testimonial-modal-close {
  float: right;
  border: none;
  background: transparent;
  color: var(--color-text-muted, #666);
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 8px;
}
</style>
