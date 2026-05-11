<script setup lang="ts">
import { computed } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import UiIcon from "./UiIcon.vue";

type FaqItem = {
  question: string;
  answer: string;
};

const props = defineProps<{
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
}>();

const QUESTION_LIMIT = 120;

const items = computed<FaqItem[]>(() => {
  const raw = props.node?.attrs?.items;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    question: typeof item?.question === "string" ? item.question : "",
    answer: typeof item?.answer === "string" ? item.answer : "",
  }));
});

function updateItem(index: number, patch: Partial<FaqItem>) {
  const next = items.value.map((item, i) =>
    i === index ? { ...item, ...patch } : item,
  );
  props.updateAttributes({ items: next });
}

function addItem() {
  props.updateAttributes({
    items: [...items.value, { question: "", answer: "" }],
  });
}

function removeItem(index: number) {
  const next = items.value.filter((_, i) => i !== index);
  props.updateAttributes({ items: next });
}
</script>

<template>
  <NodeViewWrapper class="tiptap-faq-node" contenteditable="false">
    <div class="faq-node-header">
      <div>
        <div class="faq-node-title">FAQ accordion</div>
        <div class="faq-node-subtitle">Native details/summary blocks</div>
      </div>
      <button class="faq-node-add" type="button" @click="addItem">
        <UiIcon name="Plus" :size="14" aria-hidden="true" />
        Add item
      </button>
    </div>

    <div v-if="items.length === 0" class="faq-node-empty">
      No items yet. Add your first question.
    </div>

    <div v-else class="faq-node-items">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="faq-node-item"
      >
        <div class="faq-node-fields">
          <label class="faq-node-label">
            Question
            <span class="faq-node-count"
              >{{ (item.question || "").length }}/{{ QUESTION_LIMIT }}</span
            >
          </label>
          <input
            class="faq-node-input"
            type="text"
            :maxlength="QUESTION_LIMIT"
            :value="item.question"
            placeholder="What does this include?"
            @input="
              updateItem(index, {
                question: ((
                  $event.target as HTMLInputElement
                ).value || '').slice(0, QUESTION_LIMIT),
              })
            "
          />

          <label class="faq-node-label">Answer</label>
          <textarea
            class="faq-node-textarea"
            rows="3"
            :value="item.answer"
            placeholder="Describe the answer in a few sentences."
            @input="
              updateItem(index, {
                answer: ($event.target as HTMLTextAreaElement).value || '',
              })
            "
          ></textarea>
        </div>
        <button
          class="faq-node-remove"
          type="button"
          title="Remove item"
          @click="removeItem(index)"
        >
          <UiIcon name="Trash2" :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.tiptap-faq-node {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.faq-node-title {
  font-weight: 600;
  font-size: 15px;
}

.faq-node-subtitle {
  color: var(--color-text-muted);
  font-size: 12px;
}

.faq-node-add {
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

.faq-node-empty {
  color: var(--color-text-muted);
  font-size: 13px;
}

.faq-node-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-node-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg);
}

.faq-node-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.faq-node-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.faq-node-count {
  font-weight: 500;
}

.faq-node-input,
.faq-node-textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}

.faq-node-textarea {
  resize: vertical;
}

.faq-node-remove {
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.faq-node-remove:hover {
  color: #ef4444;
}
</style>
