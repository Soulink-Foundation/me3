<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { RouteLocationRaw } from "vue-router";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "outline";
    size?: "small" | "medium" | "large";
    /** When set, renders as `RouterLink`. */
    to?: RouteLocationRaw;
    /** When set (and `to` is not), renders as `<a>`. */
    href?: string;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }>(),
  {
    variant: "outline",
    size: "medium",
    type: "button",
  },
);

const root = computed(() => {
  if (props.to !== undefined) return RouterLink;
  if (props.href !== undefined) return "a";
  return "button";
});

const rootAttrs = computed(() => {
  if (props.to !== undefined) return { to: props.to };
  if (props.href !== undefined) return { href: props.href };
  return {
    type: props.type,
    disabled: props.disabled,
  };
});
</script>

<template>
  <component
    :is="root"
    class="me3-btn"
    :class="[`me3-btn--${variant}`, `me3-btn--${size}`]"
    v-bind="rootAttrs"
  >
    <span v-if="$slots.icon" class="me3-btn__icon">
      <slot name="icon" />
    </span>
    <slot />
  </component>
</template>

<style scoped>
/* Variants align with WizardCallToAction `.style-preview` (primary / secondary / outline). */

.me3-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-family: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  border-style: solid;
  border-color: transparent;
}

button.me3-btn {
  appearance: none;
}

.me3-btn:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.me3-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.me3-btn__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  line-height: 0;
}

/* --- variants --- */

.me3-btn--primary {
  background: var(--color-accent);
  color: var(--color-bg);
  border-width: 0;
  border-radius: 22px;
}

.me3-btn--primary:hover:not(:disabled) {
  opacity: 0.9;
}

.me3-btn--secondary {
  background: var(--color-border);
  color: var(--color-text);
  border-width: 0;
  border-radius: 22px;
}

.me3-btn--secondary:hover:not(:disabled) {
  background: var(--color-text-muted);
  color: var(--color-bg);
}

.me3-btn--outline {
  background: transparent;
  border-width: 1px;
  border-color: var(--color-border);
  color: var(--color-text);
}

.me3-btn--outline:hover:not(:disabled) {
  opacity: 0.88;
}

/* --- sizes --- */

.me3-btn--small {
  gap: 6px;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 22px;
  font-size: 13px;
}

.me3-btn--medium {
  gap: 8px;
  min-height: 40px;
  padding: 8px 14px;
  border-radius: 22px;
  font-size: 14px;
}

.me3-btn--large {
  gap: 10px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 15px;
}
</style>
