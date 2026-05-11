<template>
  <span v-if="show" class="pro-badge" :title="title">
    {{ text }}
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    show?: boolean;
    text?: string;
    title?: string;
  }>(),
  {
    show: true,
    text: "Pro",
  },
);
</script>

<style scoped>
.pro-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 3px 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 4px;
}
</style>
