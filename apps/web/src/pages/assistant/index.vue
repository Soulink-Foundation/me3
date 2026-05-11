<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";

definePage({
  meta: {
    requiresAuth: true,
    title: "Assistant | ME3",
    description: "ME3 Core assistant workspace.",
    robots: "noindex,follow",
  },
});
</script>

<template>
  <main class="assistant-placeholder">
    <section class="assistant-placeholder__panel">
      <div class="assistant-placeholder__icon" aria-hidden="true">🤖</div>
      <div class="assistant-placeholder__copy">
        <h1>Assistant</h1>
        <p>
          The ME3 Core assistant workspace will land here. Calendar, email,
          sites, and settings are copied from the ME3 app UI as the starting
          point.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.assistant-placeholder {
  min-height: 100vh;
  padding: 32px;
  background: var(--color-bg);
  color: var(--color-text);
}

.assistant-placeholder__panel {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  max-width: 760px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-card);
}

.assistant-placeholder__icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg-muted);
  font-size: 24px;
}

.assistant-placeholder__copy {
  display: grid;
  gap: 10px;
}

.assistant-placeholder h1,
.assistant-placeholder p {
  margin: 0;
}

.assistant-placeholder h1 {
  font-size: 28px;
  line-height: 1.1;
}

.assistant-placeholder p {
  max-width: 560px;
  color: var(--color-text-muted);
  font-size: 15px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .assistant-placeholder {
    padding: 20px;
  }

  .assistant-placeholder__panel {
    flex-direction: column;
  }
}
</style>
