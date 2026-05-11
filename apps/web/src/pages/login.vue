<script setup lang="ts">
import { computed, ref } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import { useRouter, useRoute } from "vue-router";
import BrandLogo from "../components/BrandLogo.vue";
import ThemeToggle from "../components/ThemeToggle.vue";
import { useAuthStore } from "../stores/auth";
import { DEFAULT_APP_PATH } from "../utils/navigation";

definePage({
  path: "/",
  alias: ["/login"],
  meta: {
    title: "Set up ME3 Core | Personal AI assistant",
    description:
      "Set up your installable ME3 Core personal AI assistant with an owner bootstrap code.",
    robots: "noindex,follow",
    ogImage: "/icons/icon-512.png",
  },
});

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = ref("");
const name = ref("ME3 Core Owner");
const username = ref("owner");
const bootstrapCode = ref("");
const loading = ref(false);
const error = ref("");

const canSubmit = computed(
  () =>
    bootstrapCode.value.trim().length > 0 &&
    name.value.trim().length > 0 &&
    username.value.trim().length > 0 &&
    !loading.value,
);

function resolvePostLoginRedirect(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_APP_PATH;
  const redirect = raw.trim();
  if (!redirect) return DEFAULT_APP_PATH;

  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }

  try {
    const parsed = new URL(redirect);
    const allowedHosts = new Set([window.location.hostname]);
    const sameHost = allowedHosts.has(parsed.hostname);
    const devLocalhost =
      import.meta.env.DEV &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (
      (sameHost || devLocalhost) &&
      ["http:", "https:"].includes(parsed.protocol)
    ) {
      return parsed.toString();
    }
  } catch {
    // Fall through to default.
  }

  return DEFAULT_APP_PATH;
}

function navigateAfterLogin(target: string) {
  if (target.startsWith("http://") || target.startsWith("https://")) {
    window.location.href = target;
    return;
  }
  router.push(target);
}

async function submitBootstrap() {
  if (!canSubmit.value) return;

  loading.value = true;
  error.value = "";

  const success = await auth.bootstrapOwner({
    bootstrapCode: bootstrapCode.value,
    email: email.value,
    name: name.value,
    username: username.value,
  });

  if (success) {
    const redirect = resolvePostLoginRedirect(route.query.redirect);
    navigateAfterLogin(redirect);
  } else {
    error.value = "Bootstrap failed. Check your owner code and try again.";
  }

  loading.value = false;
}
</script>

<template>
  <div class="login">
    <header class="login__header">
      <router-link to="/" class="login__brand" aria-label="me3 home">
        <BrandLogo class="login__logo" alt="me3" />
      </router-link>
      <nav class="login__nav" aria-label="Primary">
        <router-link
          v-if="auth.isAuthenticated"
          to="/calendar"
          class="login__nav-link"
        >
          Open ME3
        </router-link>
        <a
          v-else
          class="login__nav-link"
          href="https://github.com/Soulink-Foundation/me3"
          target="_blank"
          rel="noopener"
        >
          View repo
        </a>
        <ThemeToggle />
      </nav>
    </header>

    <main class="login__main">
      <section class="hero" aria-labelledby="login-title">
        <div class="hero__copy">
          <h1 id="login-title" class="hero__title">
            Set up your ME3 Core owner workspace.
          </h1>
          <p class="hero__text">
            Use the generated bootstrap code from your Cloudflare install to
            create the local owner profile. Email delivery stays out of the OSS
            core until an owner configures a provider.
          </p>
        </div>

        <form class="setup-form" @submit.prevent="submitBootstrap">
          <div class="setup-form__header">
            <h2 class="setup-form__title">Owner bootstrap</h2>
            <p class="setup-form__text">
              Find the code in your generated local or deployment secrets.
            </p>
          </div>

          <label class="field">
            <span class="label">Bootstrap code</span>
            <input
              v-model="bootstrapCode"
              type="password"
              autocomplete="one-time-code"
              class="input"
              required
              autofocus
            />
          </label>

          <div class="field-grid">
            <label class="field">
              <span class="label">Name</span>
              <input
                v-model="name"
                type="text"
                autocomplete="name"
                class="input"
                required
              />
            </label>

            <label class="field">
              <span class="label">Username</span>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                class="input"
                required
              />
            </label>
          </div>

          <label class="field">
            <span class="label">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="optional@example.com"
              class="input"
            />
          </label>

          <button type="submit" class="button" :disabled="!canSubmit">
            {{ loading ? "Bootstrapping..." : "Open workspace" }}
          </button>

          <p v-if="error" class="error">{{ error }}</p>
        </form>

        <div class="hero__visual" aria-hidden="true">
          <div class="hero__mark">
            <BrandLogo class="hero__mark-logo" alt="" />
            <div class="hero__mark-lines">
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--ui-bg, var(--color-bg));
  color: var(--ui-text, var(--color-text));
}

.login__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0;
}

.login__brand,
.login__nav-link {
  color: inherit;
  text-decoration: none;
}

.login__logo {
  display: block;
  width: 92px;
  height: auto;
}

.login__nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.login__nav-link {
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--ui-text-muted, var(--color-text-muted));
}

.login__main {
  flex: 1;
  display: flex;
  align-items: center;
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 72px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(320px, 420px);
  align-items: center;
  gap: clamp(32px, 6vw, 72px);
  width: 100%;
}

.hero__copy {
  max-width: 680px;
}

.hero__title {
  margin: 0;
  font-family: var(--font-display, var(--font-sans));
  font-size: clamp(3rem, 6vw, 6rem);
  line-height: 0.96;
  letter-spacing: 0;
}

.hero__text {
  max-width: 620px;
  margin: 28px 0 0;
  color: var(--ui-text-muted, var(--color-text-muted));
  font-size: clamp(1.04rem, 1.5vw, 1.18rem);
  line-height: 1.65;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--ui-border, var(--color-border));
  border-radius: var(--ui-radius-md, 8px);
  background: var(--ui-surface, var(--color-bg));
}

.setup-form__header {
  margin-bottom: 2px;
}

.setup-form__title {
  margin: 0;
  font-size: 1.24rem;
  line-height: 1.2;
}

.setup-form__text {
  margin: 8px 0 0;
  color: var(--ui-text-muted, var(--color-text-muted));
  font-size: 0.94rem;
  line-height: 1.45;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.label {
  color: var(--ui-text-muted, var(--color-text-muted));
  font-size: 0.82rem;
  font-weight: 700;
}

.input {
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid var(--ui-border-strong, var(--color-border-strong));
  border-radius: var(--ui-radius-sm, 8px);
  background: var(--ui-bg, var(--color-bg));
  color: var(--ui-text, var(--color-text));
  font-size: 0.98rem;
  outline: none;
}

.input:focus {
  border-color: var(--ui-text, var(--color-text));
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid var(--ui-text, var(--color-text));
  border-radius: var(--ui-radius-sm, 8px);
  background: var(--ui-text, var(--color-text));
  color: var(--ui-bg, var(--color-bg));
  cursor: pointer;
  font-size: 0.98rem;
  font-weight: 800;
  transition: opacity 0.2s;
}

.button:hover:not(:disabled) {
  opacity: 0.9;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin: 0;
  color: #e53935;
  font-size: 0.9rem;
}

.hero__visual {
  grid-column: 1 / -1;
}

.hero__mark {
  display: grid;
  align-content: center;
  gap: 24px;
  width: min(100%, 420px);
  aspect-ratio: 1;
  padding: clamp(38px, 6vw, 64px);
  border: 1px solid var(--ui-border, var(--color-border));
  border-radius: var(--ui-radius-md, 8px);
  background: var(--ui-bg, var(--color-bg));
}

.hero__mark-logo {
  width: min(100%, 220px);
  height: auto;
}

.hero__mark-lines {
  display: grid;
  gap: 12px;
}

.hero__mark-lines span {
  display: block;
  height: 1px;
  background: var(--ui-border, var(--color-border));
}

.hero__mark-lines span:last-child {
  width: 56%;
}

@media (max-width: 900px) {
  .login__header,
  .login__main {
    width: min(100% - 28px, 1120px);
  }

  .login__main {
    align-items: flex-start;
    padding-top: 38px;
  }

  .hero {
    grid-template-columns: 1fr;
  }

  .hero__title {
    font-size: clamp(2.7rem, 14vw, 4.8rem);
  }

  .setup-form {
    padding: 18px;
  }
}

@media (max-width: 560px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
