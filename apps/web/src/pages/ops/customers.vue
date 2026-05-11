<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
  type SortingState,
} from "@tanstack/vue-table";
import UiIcon from "../../components/UiIcon.vue";
import OpsTabs from "../../components/ops/OpsTabs.vue";
import { useOpsStore, type OpsCustomer } from "../../stores/ops";

definePage({
  meta: {
    requiresAuth: true,
    title: "Customer Ops | ME3",
    description: "Internal customer management for me3.",
    robots: "noindex,nofollow",
  },
});

const ops = useOpsStore();

const query = ref("");
const tier = ref("");
const status = ref("");
const expandedId = ref<string | null>(null);
const grantingTier = ref<"starter" | "pro" | null>(null);
const accessGrantMessage = ref<string | null>(null);
const accessGrantError = ref<string | null>(null);
const lifecycleTestEmail = ref("");
const lifecycleSending = ref(false);
const lifecycleSendMessage = ref<string | null>(null);
const lifecycleSendError = ref<string | null>(null);

const sorting = ref<SortingState>([{ id: "created_at", desc: true }]);

const TIER_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
];

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
];

const detailCustomer = computed(
  () => ops.customers.find((c) => c.id === expandedId.value) ?? null,
);

const lifecycleLabels: Record<
  "welcome" | "agent_checkin" | "week_recap" | "trial_expiry",
  string
> = {
  welcome: "Welcome",
  agent_checkin: "Agent check-in",
  week_recap: "Week recap",
  trial_expiry: "Trial expiry",
};

const emptyStateTitle = computed(() => {
  if (ops.error) return "Access or loading issue";
  if (query.value || tier.value || status.value) return "No matching customers";
  return "No customers yet";
});

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatPlan(customer: OpsCustomer): string {
  if (customer.subscription_tier === "starter") {
    return customer.subscription_status === "trialing"
      ? "Starter trial"
      : "Starter";
  }
  if (customer.subscription_tier === "pro") {
    return customer.subscription_status === "trialing" ? "Pro trial" : "Pro";
  }
  return "Free";
}

function formatSubscriptionStatus(
  s: OpsCustomer["subscription_status"],
): string {
  if (!s) return "—";
  const map: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    canceled: "Canceled",
  };
  return map[s] ?? s;
}

function formatBillingSource(customer: OpsCustomer): string {
  switch (customer.billing_source) {
    case "manual":
      return "Manual grant";
    case "stripe":
      return "Stripe";
    case "trial":
      return "Local trial";
    default:
      return "None";
  }
}

function formatLifecycleStatus(
  st: "not_scheduled" | "scheduled" | "due" | "sent" | "skipped",
): string {
  switch (st) {
    case "not_scheduled":
      return "Not scheduled";
    case "scheduled":
      return "Scheduled";
    case "due":
      return "Due";
    case "sent":
      return "Sent";
    case "skipped":
      return "Skipped";
  }
}

function describeLifecycleEntry(entry: {
  scheduled_at: string | null;
  sent_at: string | null;
  skipped_at: string | null;
  skip_reason: string | null;
}): string {
  if (entry.sent_at) {
    return `Sent ${formatDateTime(entry.sent_at)}`;
  }
  if (entry.skipped_at) {
    const reason = entry.skip_reason ? ` (${entry.skip_reason})` : "";
    return `Skipped ${formatDateTime(entry.skipped_at)}${reason}`;
  }
  if (entry.scheduled_at) {
    return `Scheduled ${formatDateTime(entry.scheduled_at)}`;
  }
  return "Not scheduled yet";
}

const columnHelper = createColumnHelper<OpsCustomer>();

const columns = [
  columnHelper.display({
    id: "expand",
    header: "",
    size: 40,
    enableSorting: false,
  }),
  columnHelper.accessor("email", {
    header: "Email",
    enableSorting: true,
    size: 360,
    minSize: 280,
    maxSize: 560,
  }),
  columnHelper.accessor((row) => formatPlan(row), {
    id: "plan",
    header: "Plan",
    enableSorting: true,
  }),
  columnHelper.accessor((row) => row.subscription_status ?? "", {
    id: "sub_status",
    header: "Status",
    enableSorting: true,
  }),
  columnHelper.accessor("site_count", {
    id: "sites",
    header: "Sites",
    enableSorting: true,
    size: 72,
    minSize: 64,
  }),
  columnHelper.accessor("current_month_email_usage", {
    id: "messages",
    header: "Messages",
    enableSorting: true,
    size: 96,
    minSize: 80,
  }),
  columnHelper.accessor("created_at", {
    header: "Joined",
    enableSorting: true,
    sortingFn: "datetime",
  }),
];

const table = useVueTable({
  get data() {
    return ops.customers;
  },
  columns,
  state: {
    get sorting() {
      return sorting.value;
    },
  },
  onSortingChange: (updater) => {
    sorting.value =
      typeof updater === "function" ? updater(sorting.value) : updater;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getRowId: (row) => row.id,
});

const tableColumnCount = computed(() => table.getVisibleLeafColumns().length);

function opsTableHeaderStyle(header: {
  column: {
    columnDef: { size?: number; minSize?: number; maxSize?: number };
  };
}): string | undefined {
  const def = header.column.columnDef;
  const parts: string[] = [];
  if (def.minSize != null) parts.push(`min-width: ${def.minSize}px`);
  if (def.size != null) parts.push(`width: ${def.size}px`);
  if (def.maxSize != null) parts.push(`max-width: ${def.maxSize}px`);
  return parts.length ? parts.join("; ") : undefined;
}

/** Center-aligned numeric columns in the ops table */
const OPS_CENTER_COLUMN_IDS = new Set(["sites", "messages"]);

function opsHeaderCellClass(header: {
  column: { id: string; getCanSort: () => boolean };
}): Record<string, boolean> {
  return {
    "col-sortable": header.column.getCanSort(),
    "col-center": OPS_CENTER_COLUMN_IDS.has(header.column.id),
  };
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
  accessGrantMessage.value = null;
  accessGrantError.value = null;
  lifecycleSendMessage.value = null;
  lifecycleSendError.value = null;
}

function onCustomerRowClick(event: MouseEvent, id: string) {
  const el = event.target as HTMLElement | null;
  if (el?.closest("a,button,input,select,textarea,label")) return;
  toggleExpand(id);
}

function onCustomerRowKeydown(event: KeyboardEvent, id: string) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    toggleExpand(id);
  }
}

async function loadCustomers() {
  await ops.fetchCustomers({
    q: query.value,
    tier: tier.value,
    status: status.value,
  });

  if (
    expandedId.value &&
    !ops.customers.some((c) => c.id === expandedId.value)
  ) {
    expandedId.value = null;
  }
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null;

watch(query, () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    void loadCustomers();
  }, 180);
});

watch([tier, status], () => {
  void loadCustomers();
});

onMounted(async () => {
  await loadCustomers();
});

watch(detailCustomer, (customer) => {
  accessGrantMessage.value = null;
  accessGrantError.value = null;
  lifecycleSendMessage.value = null;
  lifecycleSendError.value = null;
  if (!lifecycleTestEmail.value && customer?.email) {
    lifecycleTestEmail.value = customer.email;
  }
});

async function sendLifecyclePreview() {
  if (!detailCustomer.value || !lifecycleTestEmail.value.trim()) return;

  lifecycleSending.value = true;
  lifecycleSendMessage.value = null;
  lifecycleSendError.value = null;

  try {
    const response = await ops.sendLifecyclePreview(
      detailCustomer.value.id,
      lifecycleTestEmail.value.trim(),
    );
    lifecycleSendMessage.value = `Sent ${response.sent.length} lifecycle test emails to ${lifecycleTestEmail.value.trim()}.`;
  } catch (error: any) {
    lifecycleSendError.value =
      error?.message || "Failed to send lifecycle test emails";
  } finally {
    lifecycleSending.value = false;
  }
}

async function grantAccess(tierGrant: "starter" | "pro") {
  if (!detailCustomer.value) return;

  const confirmed = window.confirm(
    `Grant ${tierGrant === "starter" ? "Starter" : "Pro"} access for 1 year to ${detailCustomer.value.email}?`,
  );
  if (!confirmed) return;

  grantingTier.value = tierGrant;
  accessGrantMessage.value = null;
  accessGrantError.value = null;

  try {
    const response = await ops.grantCustomerAccess(
      detailCustomer.value.id,
      tierGrant,
    );
    await loadCustomers();
    expandedId.value = response.customer.id;
    accessGrantMessage.value = `${response.customer.email} now has ${tierGrant === "starter" ? "Starter" : "Pro"} access until ${formatDateTime(response.grant.expires_at)}.`;
  } catch (error: any) {
    accessGrantError.value = error?.message || "Failed to grant manual access";
  } finally {
    grantingTier.value = null;
  }
}
</script>

<template>
  <div class="ops-page">
    <main class="main">
      <div class="ops-page-intro">
        <h1 class="ops-page-heading">Customer Operations</h1>
        <p class="ops-page-lede">
          Review who signed up, who converted, what they published, and which
          accounts may need attention.
        </p>
      </div>

      <OpsTabs />

      <section class="ops-stats-strip" aria-label="Customer summary">
        <div class="ops-stat">
          <span class="ops-stat__label">Customers</span>
          <strong class="ops-stat__value">{{
            formatCount(ops.summary?.total_customers || 0)
          }}</strong>
        </div>
        <span class="ops-stat__sep" aria-hidden="true" />
        <div class="ops-stat">
          <span class="ops-stat__label">Paid</span>
          <strong class="ops-stat__value">{{
            formatCount(ops.summary?.pro_customers || 0)
          }}</strong>
        </div>
        <span class="ops-stat__sep" aria-hidden="true" />
        <div class="ops-stat">
          <span class="ops-stat__label">Active subs</span>
          <strong class="ops-stat__value">{{
            formatCount(ops.summary?.active_subscriptions || 0)
          }}</strong>
        </div>
        <span class="ops-stat__sep" aria-hidden="true" />
        <div class="ops-stat">
          <span class="ops-stat__label">Published</span>
          <strong class="ops-stat__value">{{
            formatCount(ops.summary?.published_customers || 0)
          }}</strong>
        </div>
      </section>

      <section class="controls-card">
        <div
          class="ops-toolbar-row"
          role="toolbar"
          aria-label="Search and filter customers"
        >
          <label class="search-field search-field--compact ops-toolbar-search">
            <UiIcon name="Search" :size="14" aria-hidden="true" />
            <input
              v-model="query"
              type="search"
              placeholder="Email, username, or domain"
              aria-label="Search customers"
            />
          </label>

          <button
            type="button"
            class="ops-icon-refresh"
            :disabled="ops.loading"
            aria-label="Refresh customer list"
            title="Refresh"
            @click="loadCustomers"
          >
            <UiIcon name="RefreshCw" :size="18" aria-hidden="true" />
          </button>

          <label class="ops-filter-group">
            <span class="ops-filter-label">Plan</span>
            <select
              v-model="tier"
              class="ops-filter-select"
              aria-label="Filter by plan"
            >
              <option
                v-for="opt in TIER_FILTERS"
                :key="`tier-${opt.value || 'all'}`"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </label>

          <label class="ops-filter-group">
            <span class="ops-filter-label">Status</span>
            <select
              v-model="status"
              class="ops-filter-select"
              aria-label="Filter by subscription status"
            >
              <option
                v-for="opt in STATUS_FILTERS"
                :key="`st-${opt.value || 'all'}`"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </label>

          <span class="ops-usage-month" title="Usage month for metrics"
            >Month: {{ ops.filters?.month || "n/a" }}</span
          >
        </div>
      </section>

      <p v-if="ops.loading" class="notice" role="status" aria-live="polite">
        Loading customer data…
      </p>
      <p v-else-if="ops.error" class="notice error" role="alert">
        {{ ops.error }}
      </p>

      <section
        v-else-if="ops.customers.length > 0"
        class="table-card"
        aria-label="Customer accounts"
      >
        <table class="ledger-table ledger-table--ops">
          <thead>
            <tr>
              <th
                v-for="header in table.getFlatHeaders()"
                :key="header.id"
                :style="opsTableHeaderStyle(header)"
                :class="opsHeaderCellClass(header)"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                {{ header.column.columnDef.header as string }}
                <span v-if="header.column.getIsSorted()" class="sort-indicator">
                  {{ header.column.getIsSorted() === "asc" ? "↑" : "↓" }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in table.getRowModel().rows" :key="row.id">
              <tr
                class="ledger-row ledger-row--expandable"
                role="button"
                tabindex="0"
                :class="{
                  'ledger-row--expanded': expandedId === row.original.id,
                }"
                :aria-expanded="
                  expandedId === row.original.id ? 'true' : 'false'
                "
                :aria-label="`Toggle details for ${row.original.email}`"
                @click="onCustomerRowClick($event, row.original.id)"
                @keydown="onCustomerRowKeydown($event, row.original.id)"
              >
                <td class="cell-expand">
                  <span class="row-toggle" aria-hidden="true">{{
                    expandedId === row.original.id ? "−" : "+"
                  }}</span>
                </td>
                <td class="cell-email" :title="row.original.email">
                  {{ row.original.email }}
                </td>
                <td>
                  <span class="pill" :class="row.original.subscription_tier">{{
                    formatPlan(row.original)
                  }}</span>
                </td>
                <td class="cell-muted">
                  {{
                    formatSubscriptionStatus(row.original.subscription_status)
                  }}
                </td>
                <td class="cell-num cell-num--center">
                  {{ row.original.site_count }}
                </td>
                <td class="cell-num cell-num--center">
                  {{ row.original.current_month_email_usage }}
                </td>
                <td
                  class="cell-date"
                  :title="formatDateTime(row.original.created_at)"
                >
                  {{ formatDateShort(row.original.created_at) }}
                </td>
              </tr>

              <tr
                v-if="expandedId === row.original.id"
                class="detail-row"
                @click.stop
              >
                <td :colspan="tableColumnCount" class="detail-cell">
                  <div v-if="detailCustomer" class="detail-panel ops-detail">
                    <div class="ops-detail__top">
                      <div class="ops-detail__title">
                        <span class="ops-detail__eyebrow">Account</span>
                        <p class="ops-detail__email">
                          {{ detailCustomer.email }}
                        </p>
                      </div>
                      <div class="ops-detail__pills">
                        <span
                          class="pill"
                          :class="detailCustomer.subscription_tier"
                          >{{ formatPlan(detailCustomer) }}</span
                        >
                        <span class="pill quiet">{{
                          formatSubscriptionStatus(
                            detailCustomer.subscription_status,
                          )
                        }}</span>
                      </div>
                    </div>

                    <div class="ops-detail__grid">
                      <div class="ops-mini-block">
                        <h3 class="ops-mini-block__h">IDs & billing</h3>
                        <dl class="ops-kv">
                          <div>
                            <dt>Stripe customer</dt>
                            <dd>
                              {{ detailCustomer.stripe_customer_id || "—" }}
                            </dd>
                          </div>
                          <div>
                            <dt>Subscription</dt>
                            <dd>
                              {{ detailCustomer.stripe_subscription_id || "—" }}
                            </dd>
                          </div>
                          <div>
                            <dt>Source</dt>
                            <dd>{{ formatBillingSource(detailCustomer) }}</dd>
                          </div>
                          <div>
                            <dt>Connect</dt>
                            <dd>
                              {{
                                detailCustomer.stripe_connect_status ||
                                "Not connected"
                              }}
                            </dd>
                          </div>
                          <div>
                            <dt>Renews / ends</dt>
                            <dd>
                              {{
                                formatDateTime(
                                  detailCustomer.subscription_expires_at,
                                )
                              }}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div class="ops-mini-block">
                        <h3 class="ops-mini-block__h">Activity</h3>
                        <dl class="ops-kv">
                          <div>
                            <dt>Created</dt>
                            <dd>
                              {{ formatDateTime(detailCustomer.created_at) }}
                            </dd>
                          </div>
                          <div>
                            <dt>Updated</dt>
                            <dd>
                              {{ formatDateTime(detailCustomer.updated_at) }}
                            </dd>
                          </div>
                          <div>
                            <dt>Custom domains</dt>
                            <dd>{{ detailCustomer.custom_domain_count }}</dd>
                          </div>
                          <div>
                            <dt>Published sites</dt>
                            <dd>
                              {{ detailCustomer.published_site_count }} /
                              {{ detailCustomer.site_count }}
                            </dd>
                          </div>
                          <div>
                            <dt>Latest publish</dt>
                            <dd>
                              {{
                                formatDateTime(
                                  detailCustomer.latest_published_at,
                                )
                              }}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div class="ops-mini-block">
                        <h3 class="ops-mini-block__h">Manual access</h3>
                        <p class="ops-mini-block__hint">
                          Grant 1 year Starter or Pro without Stripe.
                        </p>
                        <div class="ops-inline-actions">
                          <button
                            class="ops-btn"
                            type="button"
                            :disabled="grantingTier !== null"
                            @click="grantAccess('starter')"
                          >
                            {{
                              grantingTier === "starter"
                                ? "Granting…"
                                : "Grant Starter"
                            }}
                          </button>
                          <button
                            class="ops-btn"
                            type="button"
                            :disabled="grantingTier !== null"
                            @click="grantAccess('pro')"
                          >
                            {{
                              grantingTier === "pro" ? "Granting…" : "Grant Pro"
                            }}
                          </button>
                        </div>
                        <p
                          v-if="detailCustomer.billing_source === 'manual'"
                          class="ops-mini-block__hint"
                        >
                          Current:
                          {{ formatPlan(detailCustomer) }} until
                          {{
                            formatDateTime(
                              detailCustomer.subscription_expires_at,
                            )
                          }}.
                        </p>
                        <p v-if="accessGrantMessage" class="notice ops-notice">
                          {{ accessGrantMessage }}
                        </p>
                        <p
                          v-if="accessGrantError"
                          class="notice error ops-notice"
                        >
                          {{ accessGrantError }}
                        </p>
                      </div>
                    </div>

                    <section
                      class="ops-detail__section ops-detail__section--contained"
                      aria-labelledby="lifecycle-heading"
                    >
                      <h3 id="lifecycle-heading" class="ops-section-h">
                        Lifecycle emails
                      </h3>
                      <div class="ops-lifecycle-bar">
                        <label class="ops-compact-field">
                          <span>Test inbox</span>
                          <input
                            v-model="lifecycleTestEmail"
                            type="email"
                            placeholder="name@example.com"
                            autocomplete="email"
                          />
                        </label>
                        <button
                          class="ops-btn"
                          type="button"
                          :disabled="
                            lifecycleSending || !lifecycleTestEmail.trim()
                          "
                          @click="sendLifecyclePreview"
                        >
                          {{
                            lifecycleSending ? "Sending…" : "Send all 4 as test"
                          }}
                        </button>
                      </div>
                      <p v-if="lifecycleSendMessage" class="notice ops-notice">
                        {{ lifecycleSendMessage }}
                      </p>
                      <p
                        v-if="lifecycleSendError"
                        class="notice error ops-notice"
                      >
                        {{ lifecycleSendError }}
                      </p>
                      <ul class="ops-lifecycle-list">
                        <li
                          v-for="entry in detailCustomer.lifecycle_emails"
                          :key="entry.email_key"
                          class="ops-lifecycle-row"
                        >
                          <span class="ops-lifecycle-name">{{
                            lifecycleLabels[entry.email_key]
                          }}</span>
                          <span class="pill quiet">{{
                            formatLifecycleStatus(entry.status)
                          }}</span>
                          <span
                            class="ops-lifecycle-meta"
                            :title="describeLifecycleEntry(entry)"
                            >{{ describeLifecycleEntry(entry) }}</span
                          >
                        </li>
                      </ul>
                    </section>

                    <section
                      v-if="detailCustomer.sites.length > 0"
                      class="ops-detail__section ops-detail__section--contained"
                      aria-labelledby="sites-heading"
                    >
                      <h3 id="sites-heading" class="ops-section-h">Sites</h3>
                      <ul class="ops-site-list">
                        <li
                          v-for="site in detailCustomer.sites"
                          :key="site.id"
                          class="ops-site-row"
                        >
                          <div class="ops-site-row__main">
                            <strong>{{ site.username }}</strong>
                            <a
                              :href="site.url"
                              target="_blank"
                              rel="noreferrer"
                              class="plain-link"
                              >{{ site.url }}</a
                            >
                          </div>
                          <span class="pill quiet">{{
                            site.published_at ? "Published" : "Draft"
                          }}</span>
                          <span class="ops-site-meta">
                            pub
                            {{ formatDateShort(site.published_at) }} · created
                            {{ formatDateShort(site.created_at) }}
                            <template v-if="site.custom_domain">
                              · {{ site.custom_domain }} ({{
                                site.custom_domain_status || "?"
                              }})
                            </template>
                          </span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </section>

      <section
        v-else-if="!ops.loading"
        class="empty-state"
        aria-labelledby="empty-state-title"
      >
        <h2 id="empty-state-title">{{ emptyStateTitle }}</h2>
        <p>
          {{
            ops.error ||
            "Try clearing filters or check back once more customers are live."
          }}
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  background: var(--color-bg);
}

.ops-page {
  min-height: 100vh;
  color: var(--color-text);
}

.ops-page-intro {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 4px;
}

.ops-page-heading {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ops-page-lede {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-muted);
  max-width: 720px;
}

.main {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 40px 40px;
}

.ops-stats-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  font-size: 12px;
}

.ops-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.ops-stat__label {
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 10px;
}

.ops-stat__value {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ops-stat__sep {
  width: 1px;
  height: 14px;
  background: var(--color-border);
  align-self: center;
  opacity: 0.85;
}

.controls-card {
  padding: 12px 14px;
}

.ops-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}

.ops-toolbar-search {
  flex: 1 1 220px;
  min-width: 180px;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  max-width: 360px;
  flex: 1 1 200px;
  padding: 0 10px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.search-field--compact input {
  font-size: 13px;
}

.search-field input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
}

.search-field input:focus {
  outline: none;
}

label.search-field.ops-toolbar-search {
  max-width: none;
}

.ops-icon-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}

.ops-icon-refresh:hover:not(:disabled) {
  border-color: var(--color-text);
}

.ops-icon-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ops-usage-month {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
  margin-left: auto;
}

.ops-filter-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.ops-filter-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.ops-filter-select {
  min-width: 128px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.ops-filter-select:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 1px;
}

.table-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  overflow: hidden;
}

.ledger-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.ledger-table--ops {
  table-layout: fixed;
}

.ledger-table thead tr {
  border-bottom: 1px solid var(--color-border);
}

.ledger-table th {
  padding: 8px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  white-space: nowrap;
  user-select: none;
}

.ledger-table th.col-sortable {
  cursor: pointer;
}

.ledger-table th.col-sortable:hover {
  color: var(--color-text);
}

.ledger-table th.col-center {
  text-align: center;
}

.sort-indicator {
  margin-left: 4px;
  font-size: 10px;
}

.ledger-row td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.ledger-row:hover {
  background: var(--color-bg-subtle);
}

.ledger-row--expandable {
  cursor: pointer;
}

.ledger-row--expandable:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: -2px;
}

.ledger-row--expanded {
  background: var(--color-bg-subtle);
}

.cell-expand {
  width: 40px;
  text-align: center;
  color: var(--color-text-muted);
}

.cell-email {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

.cell-muted {
  color: var(--color-text-muted);
}

.cell-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cell-num.cell-num--center {
  text-align: center;
}

.cell-date {
  white-space: nowrap;
  color: var(--color-text-muted);
}

.row-toggle {
  font-size: 16px;
  line-height: 1;
  font-weight: 600;
}

.pill {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--color-border);
  font-family: "Courier New", monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
}

.pill.pro {
  background: rgba(76, 175, 80, 0.12);
  color: #2e7d32;
}

.pill.starter {
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
}

.pill.free,
.pill.quiet {
  color: var(--color-text-muted);
}

.detail-row td {
  padding: 0;
  background: var(--color-bg-subtle);
}

.detail-cell {
  vertical-align: top;
  min-width: 0;
}

.detail-panel {
  padding: 12px 14px 14px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.ops-detail__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.ops-detail__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.ops-detail__email {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

.ops-detail__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ops-detail__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ops-mini-block {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--color-bg);
}

.ops-mini-block__h {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.ops-mini-block__hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.ops-kv {
  display: grid;
  gap: 6px;
  margin: 0;
}

.ops-kv div {
  display: grid;
  gap: 1px;
}

.ops-kv dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.ops-kv dd {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  word-break: break-word;
}

.ops-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ops-btn {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  background: var(--color-text);
  color: var(--color-bg);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.ops-btn:hover:not(:disabled) {
  opacity: 0.92;
}

.ops-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ops-detail__section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.ops-detail__section--contained {
  max-width: min(42rem, 100%);
  box-sizing: border-box;
}

.ops-section-h {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.ops-lifecycle-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}

.ops-compact-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 180px;
  min-width: 0;
  max-width: min(360px, 100%);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.ops-compact-field input {
  min-height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  color: var(--color-text);
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
}

.ops-lifecycle-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.ops-lifecycle-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  font-size: 12px;
}

.ops-lifecycle-name {
  flex: 0 0 auto;
  font-weight: 600;
}

.ops-lifecycle-row .pill {
  flex: 0 0 auto;
}

.ops-lifecycle-meta {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ops-site-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.ops-site-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  font-size: 12px;
}

.ops-site-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ops-site-meta {
  grid-column: 1 / -1;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1.35;
  word-break: break-word;
}

.plain-link {
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.notice {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--color-border);
  font-size: 12px;
}

.ops-notice {
  margin-top: 8px;
}

.notice.error {
  color: #e53935;
  background: rgba(229, 57, 53, 0.08);
  border: 1px solid rgba(229, 57, 53, 0.2);
}

.empty-state {
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  background: var(--color-bg);
}

.empty-state h2 {
  margin: 0 0 8px;
}

.empty-state p {
  margin: 0;
  color: var(--color-text-muted);
}

@media (max-width: 1080px) {
  .ops-detail__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .main {
    padding: 16px;
  }

  .ops-usage-month {
    margin-left: 0;
    flex-basis: 100%;
  }
}
</style>
