<script setup lang="ts">
import { definePage } from "unplugin-vue-router/runtime";
import { useAuthStore } from "../stores/auth";
import SiteFooter from "../components/SiteFooter.vue";
import BrandLogo from "../components/BrandLogo.vue";
import ThemeToggle from "../components/ThemeToggle.vue";

definePage({
  meta: {
    title: "About | ME3",
    description:
      "Learn what me3 is building: simple AI-ready sites and tools for people who work one-to-one.",
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
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">About me3</p>
          <h1 class="title">
            A Simple tool for people who work with people 1:1 and prefer simple.
          </h1>
        </div>
      </section>

      <div class="prose">
        <p><strong>Someone once said:</strong> I want a simple website.</p>
        <p><strong>I said:</strong> Me too!</p>
        <p><strong>Then a voice inside said:</strong> 'ME3!'</p>
        <p><strong>And so, here we are.</strong></p>
        <h2>What ME3 is</h2>
        <p>
          ME3 is a simple tool for coaches, guides, therapists, and other
          solo-professionals. It combines a simple, effective site, booking
          system, email, and AI help so the business can keep moving without a
          bunch of moving parts.
        </p>

        <h2>Why it exists</h2>
        <p>
          I built it for myself too. The goal is a top-class AI assistant that
          helps with real-world tasks like boring admin, lining up clients and
          building an audience online.
        </p>

        <h2>The ME3 protocol</h2>
        <p>
          Sites on me3 expose a
          <strong
            ><a
              href="https://www.kieranbutler.com/me.json"
              target="_blank"
              rel="noopener"
              >me.json</a
            ></strong
          >
          file so AI agents know who you are, what you do and what actions they
          can take on your site like booking a call or subscribing to your
          newsletter. This ensures your site is ready for the growing number of
          people using AI agents to interact with the web.
        </p>

        <h2>Work with me</h2>
        <div class="work-with-me-intro">
          <img
            class="avatar"
            src="/kieran.jpeg"
            alt="Kieran Butler"
            width="128"
            height="128"
            loading="lazy"
            decoding="async"
          />
          <p class="lede work-with-me-bio">
            I’m Kieran, a solo-founder, co-active coach, and software engineer
            15+ years. I built ME3 because I wanted something simple enough for
            non-technical people to use without juggling a pile of tools.
          </p>
        </div>
        <p>.</p>
        <p class="survey-cta">
          If you want to talk about ME3, coaching, or working together, visit
          <a
            href="https://www.kieranbutler.com/work-with-me"
            target="_blank"
            rel="noopener"
          >
            kieranbutler.com </a
          >. If you’re a coach, therapist, or solo-preneur, I’d love a few
          minutes of your time to
          <router-link to="/survey">fill out this survey</router-link>
          to help me build the right things next. Thanks!
        </p>
        <p class="updated">Last updated: March 2026</p>
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
  padding: 60px 20px 72px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.hero {
  margin-bottom: 32px;
}

.hero-copy {
  max-width: 60ch;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-bottom: 12px;
}

.title {
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin-bottom: 16px;
}

.lede {
  font-size: 18px;
  line-height: 1.7;
  color: var(--color-text-muted);
}

.work-with-me-intro {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
  margin-bottom: 16px;
}

.prose .work-with-me-bio {
  margin-bottom: 0;
}

.avatar {
  display: block;
  width: 128px;
  height: 128px;
  border-radius: 9999px;
  object-fit: cover;
}

.survey-cta {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  font-size: 15px;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.survey-cta :deep(a) {
  color: var(--color-text);
  font-weight: 500;
}

.updated {
  margin-top: 24px;
  font-size: 13px;
  color: var(--color-text-muted);
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

.prose a {
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 600px) {
  .content {
    padding: 40px 20px 64px;
  }

  .title {
    font-size: 32px;
  }

  .work-with-me-intro {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .avatar {
    width: 96px;
    height: 96px;
  }
}
</style>
