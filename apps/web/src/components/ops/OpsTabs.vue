<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();

const isCustomersActive = computed(() =>
  route.path === "/ops/customers" || route.path.startsWith("/ops/customers/"),
);

const isSitesActive = computed(() =>
  route.path === "/ops/sites" || route.path.startsWith("/ops/sites/"),
);
</script>

<template>
  <nav class="ops-tabs" aria-label="Ops sections">
    <RouterLink
      to="/ops/customers"
      class="ops-tabs__link"
      :class="{ 'ops-tabs__link--active': isCustomersActive }"
    >
      Customers
    </RouterLink>
    <RouterLink
      to="/ops/sites"
      class="ops-tabs__link"
      :class="{ 'ops-tabs__link--active': isSitesActive }"
    >
      Sites
    </RouterLink>
  </nav>
</template>

<style scoped>
.ops-tabs {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
}

.ops-tabs__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}

.ops-tabs__link:hover {
  color: var(--color-text);
}

.ops-tabs__link--active {
  background: var(--color-text);
  color: var(--color-bg);
}

.ops-tabs__link--active:hover {
  color: var(--color-bg);
}
</style>
