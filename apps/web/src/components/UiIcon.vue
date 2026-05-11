<script setup lang="ts">
import { computed } from "vue";
import {
  UI_ICONS,
  resolveUiIconName,
  type UiIconName,
} from "../utils/icons";

const props = withDefaults(
  defineProps<{
    name: UiIconName;
    size?: number;
    title?: string;
  }>(),
  { size: 18, title: undefined },
);

const resolvedName = computed(() => resolveUiIconName(props.name));
const iconNodes = computed(() =>
  resolvedName.value ? UI_ICONS[resolvedName.value] : null,
);
</script>

<template>
  <svg
    v-if="iconNodes"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    :aria-hidden="title ? undefined : 'true'"
  >
    <title v-if="title">{{ title }}</title>
    <component
      v-for="(node, i) in iconNodes"
      :key="i"
      :is="node[0]"
      v-bind="node[1]"
    />
  </svg>
</template>
