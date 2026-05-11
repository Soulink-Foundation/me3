<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import BrandLogo from "../../components/BrandLogo.vue";
import { useAuthStore } from "../../stores/auth";
import { DEFAULT_APP_PATH } from "../../utils/navigation";

definePage({
  meta: {
    title: "Signing In | ME3",
    description: "Completing sign in to your me3 account.",
    robots: "noindex,follow",
  },
});

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const error = ref("");
const processing = ref(true);

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
  router.replace(target);
}

onMounted(async () => {
  const redirect = resolvePostLoginRedirect(route.query.redirect);

  try {
    // Handle the OAuth callback by hydrating auth state from cookie.
    const success = await auth.handleOAuthCallback();

    if (success) {
      // Redirect to the intended destination
      navigateAfterLogin(redirect);
    } else {
      error.value = "Failed to complete authentication.";
      processing.value = false;
    }
  } catch (e) {
    console.error("OAuth callback error:", e);
    error.value = "Something went wrong. Please try again.";
    processing.value = false;
  }
});

function goToLogin() {
  router.push("/login");
}
</script>

<template>
  <div class="callback">
    <div class="callback-card">
      <router-link to="/" class="logo" aria-label="me3 home">
        <BrandLogo class="logo-img" alt="me3" />
      </router-link>

      <div v-if="processing" class="processing">
        <div class="spinner"></div>
        <p>Completing sign in...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button class="button" @click="goToLogin">Back to Sign In</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.callback-card {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  color: var(--color-text);
  margin-bottom: 32px;
}

.logo-img {
  display: block;
  height: 28px;
  width: auto;
}

.processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.processing p {
  color: var(--color-text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-text);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.error-message {
  color: #e53935;
  font-size: 16px;
}

.button {
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  background: var(--color-text);
  color: var(--color-bg);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.button:hover {
  opacity: 0.9;
}
</style>
