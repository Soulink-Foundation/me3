<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { useAuthStore } from "../stores/auth";
import SiteFooter from "../components/SiteFooter.vue";
import BrandLogo from "../components/BrandLogo.vue";
import ThemeToggle from "../components/ThemeToggle.vue";

definePage({
  meta: {
    title: "Privacy Policy | ME3",
    description:
      "Read the me3 privacy policy and learn how we handle your personal data.",
  },
});

const auth = useAuthStore();
</script>

<template>
  <div class="page">
    <header class="header">
      <router-link to="/" class="logo-link" aria-label="me3 home">
        <div class="logo">
          <BrandLogo class="logo-img" alt="me3" />
        </div>
      </router-link>
      <nav class="nav">
        <router-link
          v-if="auth.isAuthenticated"
          to="/home"
          class="nav-link"
        >
          Home
        </router-link>
        <router-link v-else to="/login" class="nav-link"> Sign in </router-link>
        <ThemeToggle />
      </nav>
    </header>

    <main class="content">
      <h1 class="title">Privacy Policy</h1>
      <div class="prose">
        <p>Last updated: January 2026</p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to me3. We respect your privacy and are committed to
          protecting your personal data. This privacy policy will inform you as
          to how we look after your personal data when you visit our website and
          tell you about your privacy rights and how the law protects you.
        </p>

        <h2>2. Data We Collect</h2>
        <p>We collect minimal data necessary to provide our service:</p>
        <ul>
          <li>Identity Data: username, display name</li>
          <li>Contact Data: email address (if provided)</li>
          <li>
            Technical Data: internet protocol (IP) address, browser type and
            version
          </li>
          <li>Profile Data: your interests, preferences, and feedback</li>
        </ul>

        <h2>3. How We Use Your Data</h2>
        <p>
          We will only use your personal data when the law allows us to. Most
          commonly, we will use your personal data in the following
          circumstances:
        </p>
        <ul>
          <li>
            Where we need to perform the contract we are about to enter into or
            have entered into with you.
          </li>
          <li>
            Where it is necessary for our legitimate interests (or those of a
            third party) and your interests and fundamental rights do not
            override those interests.
          </li>
          <li>
            Where we need to comply with a legal or regulatory obligation.
          </li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We have put in place appropriate security measures to prevent your
          personal data from being accidentally lost, used or accessed in an
          unauthorized way, altered or disclosed.
        </p>

        <h2>5. Your Rights</h2>
        <p>
          Under certain circumstances, you have rights under data protection
          laws in relation to your personal data, including the right to request
          access, correction, erasure, restriction, transfer, to object to
          processing, to portability of data and (where the lawful ground of
          processing is consent) to withdraw consent.
        </p>

        <h2>6. Contact Us</h2>
        <p>
          If you have any questions about this privacy policy or our privacy
          practices, please contact us.
        </p>
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.logo-link {
  text-decoration: none;
  color: inherit;
}

.logo {
  display: inline-flex;
  align-items: center;
}

.logo-img {
  display: block;
  height: 28px;
  width: auto;
}

.nav {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav-link {
  color: var(--color-text);
  text-decoration: none;
  font-weight: 500;
}

.nav-link:hover {
  text-decoration: underline;
}

.content {
  flex: 1;
  padding: 60px 20px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.title {
  font-size: 42px;
  font-weight: 700;
  margin-bottom: 40px;
}

.prose {
  line-height: 1.6;
  color: var(--color-text);
}

.prose h2 {
  font-size: 24px;
  margin-top: 32px;
  margin-bottom: 16px;
  font-weight: 600;
}

.prose p {
  margin-bottom: 16px;
  color: var(--color-text-muted);
}

.prose ul {
  margin-bottom: 16px;
  padding-left: 24px;
  color: var(--color-text-muted);
}

.prose li {
  margin-bottom: 8px;
}

@media (max-width: 600px) {
  .title {
    font-size: 32px;
  }

  .content {
    padding: 40px 20px;
  }
}
</style>
