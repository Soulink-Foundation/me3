<script setup lang="ts">
// Not currently mounted. Retained as a dormant reference until the side-nav review is complete.
import { computed } from "vue";
import { useRoute } from "vue-router";
import {
  HUMAN_SITES_TAB_LABEL,
  HUMAN_TAB_LINKS,
  humanPrimarySitePath,
} from "../../utils/human-tabs";
import { useSitesStore } from "../../stores/sites";

const route = useRoute();
const sites = useSitesStore();

type HumanTab = { to: string; label: string };

/** Workspace surfaces (calendar, contacts, content, email, accounts, sites) need a created site. */
const hasPrimarySite = computed(() => Boolean(sites.sites[0]?.username));

const tabs = computed((): HumanTab[] => {
  const base: HumanTab[] = hasPrimarySite.value
    ? [...HUMAN_TAB_LINKS]
    : HUMAN_TAB_LINKS.filter((tab) => tab.to === "/home");
  const list: HumanTab[] = [...base];
  const username = sites.sites[0]?.username;
  if (username) {
    list.push({
      to: humanPrimarySitePath(username),
      label: HUMAN_SITES_TAB_LABEL,
    });
  }
  return list;
});

function isActive(to: string): boolean {
  if (to === "/home") {
    return route.path === "/home" || route.path === "/home/";
  }
  if (to === "/contacts") {
    return (
      route.path === "/contacts" || route.path.startsWith("/contacts/")
    );
  }
  if (to === "/content") {
    return route.path === "/content" || route.path.startsWith("/content/");
  }
  if (to.startsWith("/sites/")) {
    return route.path === to || route.path.startsWith(`${to}/`);
  }
  return route.path === to;
}
</script>

<template>
  <nav
    class="human-tabs"
    aria-label="Workspace sections"
  >
    <div class="human-tabs__inner">
      <router-link
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="human-tabs__link"
        :class="{ 'human-tabs__link--active': isActive(tab.to) }"
        :aria-current="isActive(tab.to) ? 'page' : undefined"
      >
        {{ tab.label }}
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.human-tabs {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.human-tabs__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: center;
  gap: 4px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  padding: 8px 40px 0;
  box-sizing: border-box;
}

.human-tabs__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  margin-bottom: -1px;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.human-tabs__link:hover {
  background: var(--color-bg-subtle);
  border-color: var(--color-border);
}

.human-tabs__link--active {
  border-color: var(--color-border);
  border-bottom-color: var(--color-bg);
  background: var(--color-bg);
  color: var(--color-text);
}

@media (max-width: 760px) {
  .human-tabs__inner {
    padding: 8px 16px 0;
  }
}
</style>
