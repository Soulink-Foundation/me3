<template>
  <section class="card">
    <slot />
  </section>
</template>

<style scoped>
.card {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.card :deep(.card__head) {
  flex-shrink: 0;
}

.card :deep(.card__title) {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
}

.card :deep(.card__body) {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card :deep(.card__foot) {
  flex-shrink: 0;
}
</style>
