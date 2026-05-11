<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import Button from "./Button.vue";

const props = defineProps<{
  visible: boolean;
  launching?: boolean;
  loading?: boolean;
  trialExpired?: boolean;
  ctaLabel: string;
}>();

const emit = defineEmits<{
  start: [];
  skip: [];
  launchComplete: [];
  upgrade: [];
}>();

let launchTimer: number | null = null;

function clearLaunchTimer() {
  if (launchTimer !== null) {
    window.clearTimeout(launchTimer);
    launchTimer = null;
  }
}

watch(
  () => props.launching,
  (launching) => {
    clearLaunchTimer();
    if (!launching) return;
    launchTimer = window.setTimeout(() => {
      emit("launchComplete");
    }, 900);
  },
);

onBeforeUnmount(() => {
  clearLaunchTimer();
});
</script>

<template>
  <Transition name="robot-takeover">
    <div v-if="visible" class="robot-takeover" :class="{ launching }">
      <div class="robot-backdrop" />
      <div class="robot-shell" :class="{ launching }" aria-hidden="true">
        <img
          src="/robot.png"
          alt=""
          width="180"
          height="180"
          class="robot-image"
        />
      </div>

      <div class="robot-copy" :class="{ hidden: launching }">
        <h2>Meet ME3 <br />your new assistant</h2>
        <p class="robot-description">
          ME3 will build your site, create an email account, and set up some
          jobs for your business. You can also chat with it on Telegram.
        </p>

        <div class="robot-actions">
          <Button
            v-if="!trialExpired"
            class="robot-cta"
            variant="primary"
            size="large"
            :disabled="loading || launching"
            @click="emit('start')"
          >
            {{ loading ? "Starting..." : "Start Free Trial" }}
          </Button>
          <Button
            v-else
            class="robot-cta"
            variant="primary"
            size="large"
            :disabled="loading || launching"
            @click="emit('upgrade')"
          >
            Subscribe to Pro
          </Button>
          <p v-if="!trialExpired && !launching" class="robot-helper">
            no credit card required
          </p>
          <button
            v-if="!launching"
            class="robot-skip"
            type="button"
            :disabled="loading"
            @click="emit('skip')"
          >
            Skip ->
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.robot-takeover {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.robot-backdrop {
  position: absolute;
  inset: 0;
  background: var(--color-bg);
}

.robot-shell {
  position: fixed;
  right: 50%;
  top: 0%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 172px;
  height: 172px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.12),
    0 6px 18px rgba(0, 0, 0, 0.08);
  transform: translate(50%, 50%) scale(1);
  transition:
    right 860ms cubic-bezier(0.2, 0.8, 0.2, 1),
    bottom 860ms cubic-bezier(0.2, 0.8, 0.2, 1),
    width 860ms cubic-bezier(0.2, 0.8, 0.2, 1),
    height 860ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 860ms cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 860ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.robot-shell.launching {
  right: 18px;
  bottom: 18px;
  width: 90px;
  height: 90px;
  transform: translate(0, 0) scale(1);
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.1),
    0 4px 12px rgba(0, 0, 0, 0.08);
}

.robot-image {
  width: 108px;
  height: 108px;
  object-fit: contain;
  animation: robot-float 2.4s ease-in-out infinite;
}

.robot-shell.launching .robot-image {
  width: 55px;
  height: 55px;
}

.robot-copy {
  position: relative;
  z-index: 1;
  width: min(640px, calc(100vw - 48px));
  padding: 48px 36px 36px;
  text-align: center;
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.robot-copy.hidden {
  opacity: 0;
  transform: translateY(18px);
  pointer-events: none;
}

.robot-eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.robot-copy h2 {
  margin: 0;
  font-size: clamp(30px, 4vw, 52px);
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--color-text);
}

.robot-description {
  max-width: 480px;
  margin: 18px auto 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.robot-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
}

.robot-cta {
  min-width: 180px;
}

.robot-helper {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.robot-skip {
  border: none;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.robot-skip:hover:not(:disabled) {
  color: var(--color-text);
}

.robot-takeover-enter-active,
.robot-takeover-leave-active {
  transition: opacity 200ms ease;
}

.robot-takeover-enter-from,
.robot-takeover-leave-to {
  opacity: 0;
}

@keyframes robot-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10px);
  }
}

@media (max-width: 640px) {
  .robot-copy {
    padding: 40px 24px 28px;
  }

  .robot-shell {
    width: 152px;
    height: 152px;
  }

  .robot-shell.launching {
    right: 12px;
    bottom: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .robot-shell,
  .robot-copy,
  .robot-image {
    transition: none;
    animation: none;
  }
}
</style>
