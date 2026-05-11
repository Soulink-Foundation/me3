<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { definePage } from "unplugin-vue-router/runtime";
import {
  createColumnHelper,
  getCoreRowModel,
  useVueTable,
  type SortingState,
} from "@tanstack/vue-table";
import { API_BASE, ApiError, api } from "../api";
import Button from "../components/Button.vue";
import UiIcon from "../components/UiIcon.vue";

definePage({
  meta: {
    requiresAuth: true,
    requiresWorkspace: true,
    title: "Accounts | ME3",
    description: "Track income and expenses in one clean ledger.",
    robots: "noindex,follow",
  },
});

type EntryType = "income" | "expense";
type EntryStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled"
  | "needs_review";
type EntrySource = "manual" | "email_triage" | "stripe" | "csv_import";

type FinancialCategory = {
  id: string;
  name: string;
  entryType: EntryType;
  sortOrder: number;
};

type FinancialEntry = {
  id: string;
  entryType: EntryType;
  date: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  amountCents: number;
  currency: string;
  status: EntryStatus;
  source: EntrySource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type LedgerStats = {
  thisMonthCents: number;
  lastMonthCents: number;
  topCategoryName: string | null;
  topCategoryTotalCents: number;
  entriesCount: number;
};

type StripeStatus = {
  connected: boolean;
  status: string;
  accountId?: string;
  lastSyncedAt: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  syncReady: boolean;
  requirementsDue?: string[];
  /** Stripe Connect account default currency when returned from the API */
  defaultCurrency?: string | null;
  balances: {
    available: Array<{ amountCents: number; currency: string }>;
    pending: Array<{ amountCents: number; currency: string }>;
  };
  recentPayouts: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    arrivalDate: string | null;
    createdAt: string;
  }>;
};

type StripeSyncResult = {
  chargesImported: number;
  chargesUpdated: number;
  chargesSkipped: number;
  chargesProcessed: number;
  refundsImported: number;
  refundsUpdated: number;
  refundsSkipped: number;
  refundsProcessed: number;
  lastSyncedAt: string;
};

type EntryFormState = {
  date: string;
  description: string;
  categoryId: string;
  amount: string;
  currency: string;
  status: EntryStatus;
  notes: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  total: number;
  errors: Array<{ row: number; reason: string }>;
};

const activeTab = ref<EntryType>("income");
const entries = ref<FinancialEntry[]>([]);
const categories = ref<FinancialCategory[]>([]);
const stats = ref<LedgerStats | null>(null);
const stripeStatus = ref<StripeStatus | null>(null);
const loading = ref(false);
const saving = ref(false);
const importing = ref(false);
const exporting = ref(false);
const syncingStripe = ref(false);
const error = ref("");
const total = ref(0);
const offset = ref(0);
const limit = 50;
const sorting = ref<SortingState>([{ id: "date", desc: true }]);
const searchQuery = ref("");
const categoryFilter = ref("");
const statusFilter = ref("");
const sourceFilter = ref("");
const showEntryModal = ref(false);
const showCategoryManager = ref(false);
const editingEntryId = ref<string | null>(null);
const formError = ref("");
const categoryError = ref("");
const categoryDraftName = ref("");
const editingCategoryId = ref<string | null>(null);
const editingCategoryName = ref("");
const importResult = ref<ImportResult | null>(null);
const importError = ref("");
const importFileInput = ref<HTMLInputElement | null>(null);
const stripeSyncResult = ref<StripeSyncResult | null>(null);
const stripeSyncError = ref("");

const STATUS_LABELS: Record<EntryStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  needs_review: "Needs review",
};

const SOURCE_LABELS: Record<EntrySource, string> = {
  manual: "Manual",
  email_triage: "Email triage",
  stripe: "Stripe",
  csv_import: "CSV import",
};

function emptyEntryForm(): EntryFormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: "",
    categoryId: "",
    amount: "",
    currency: "USD",
    status: activeTab.value === "income" ? "paid" : "pending",
    notes: "",
  };
}

const form = ref<EntryFormState>(emptyEntryForm());

const columnHelper = createColumnHelper<FinancialEntry>();
const columns = [
  columnHelper.accessor("date", {
    header: "Date",
    size: 104,
    enableSorting: true,
  }),
  columnHelper.accessor("description", {
    header: "Description",
    enableSorting: true,
  }),
  columnHelper.accessor("amountCents", {
    header: "Amount",
    size: 112,
    enableSorting: true,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 108,
    enableSorting: true,
  }),
  columnHelper.accessor("source", {
    header: "Source",
    size: 118,
    enableSorting: true,
  }),
  columnHelper.accessor("notes", {
    header: "Notes",
    enableSorting: false,
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    size: 148,
    enableSorting: false,
  }),
];

const table = useVueTable({
  get data() {
    return entries.value;
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
    offset.value = 0;
    void loadEntries();
  },
  getCoreRowModel: getCoreRowModel(),
});

const currentCategories = computed(() => categories.value);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / limit)));
const currentPage = computed(() => Math.floor(offset.value / limit) + 1);
const hasPreviousPage = computed(() => offset.value > 0);
const hasNextPage = computed(() => offset.value + limit < total.value);
const isIncomeTab = computed(() => activeTab.value === "income");

/** Income month totals align with Stripe Connect when connected; expenses stay USD. */
const ledgerMonthStatsCurrency = computed(() => {
  if (activeTab.value !== "income") return "USD";
  const stripe = stripeStatus.value;
  if (!stripe?.connected) return "USD";
  if (stripe.defaultCurrency) return stripe.defaultCurrency;
  const fromBalance =
    stripe.balances?.available?.[0]?.currency ??
    stripe.balances?.pending?.[0]?.currency;
  if (fromBalance) return fromBalance;
  const fromPayout = stripe.recentPayouts?.[0]?.currency;
  return fromPayout ?? "USD";
});

const monthStatCards = computed(() => {
  const current = stats.value;
  if (!current) return [];
  const currency = ledgerMonthStatsCurrency.value;

  return [
    {
      label: "This month",
      value: formatCurrency(current.thisMonthCents, currency),
      note:
        activeTab.value === "income"
          ? "Income logged so far"
          : "Expenses logged so far",
    },
    {
      label: "Last month",
      value: formatCurrency(current.lastMonthCents, currency),
      note: "Previous full month",
    },
  ];
});

const accountSummaryLines = computed(() => {
  const cards = monthStatCards.value;
  return {
    thisMonth: cards[0]?.value ?? "—",
    lastMonth: cards[1]?.value ?? "—",
  };
});

const stripeSummaryStatus = computed(() => {
  if (!isIncomeTab.value) {
    return expenseTopCategoryCard.value?.value ?? "No entries yet";
  }
  if (!stripeStatus.value) return "Stripe unavailable";
  if (!stripeStatus.value.connected) return "Stripe not connected";
  if (!stripeStatus.value.syncReady) return "Stripe setup incomplete";
  return "Stripe connected";
});

const expenseTopCategoryCard = computed(() => {
  const current = stats.value;
  if (!current || activeTab.value !== "expense") return null;

  return {
    label: "Top category",
    value: current.topCategoryName || "No entries yet",
    note:
      current.topCategoryTotalCents > 0
        ? formatCurrency(current.topCategoryTotalCents, "USD")
        : "Nothing tracked yet",
  };
});

const stripePayoutPreview = computed(() => {
  const list = stripeStatus.value?.recentPayouts ?? [];
  return list.slice(0, 2);
});

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Payout rows: "17 Feb 2026" (day-first, independent of locale). */
function formatPayoutLineDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function stripePayoutPreviewLine(
  payout: StripeStatus["recentPayouts"][number],
  index: number,
) {
  const amount = formatCurrency(payout.amountCents, payout.currency);
  const when = formatPayoutLineDate(payout.arrivalDate || payout.createdAt);
  return index === 0
    ? `Recent payouts · ${amount} · ${when}`
    : `${amount} · ${when}`;
}

function statusBadgeClass(status: EntryStatus) {
  return `ledger-status-badge--${status}`;
}

function sourceBadgeClass(source: EntrySource) {
  return `ledger-source-badge--${source}`;
}

function resetEntryForm() {
  editingEntryId.value = null;
  form.value = emptyEntryForm();
  formError.value = "";
}

function buildEntryQueryParams(includePagination = true) {
  const params = new URLSearchParams();
  params.set("entryType", activeTab.value);

  if (includePagination) {
    params.set("limit", String(limit));
    params.set("offset", String(offset.value));

    const activeSort = sorting.value[0];
    if (activeSort) {
      params.set("sortBy", activeSort.id);
      params.set("sortDir", activeSort.desc ? "desc" : "asc");
    }
  }

  if (searchQuery.value.trim()) {
    params.set("search", searchQuery.value.trim());
  }
  if (categoryFilter.value) {
    params.set("categoryId", categoryFilter.value);
  }
  if (statusFilter.value) {
    params.set("status", statusFilter.value);
  }
  if (sourceFilter.value) {
    params.set("source", sourceFilter.value);
  }

  return params;
}

function openCreateModal() {
  resetEntryForm();
  showEntryModal.value = true;
}

function openEditModal(entry: FinancialEntry) {
  editingEntryId.value = entry.id;
  form.value = {
    date: entry.date,
    description: entry.description,
    categoryId: entry.categoryId || "",
    amount: (entry.amountCents / 100).toFixed(2),
    currency: entry.currency,
    status: entry.status,
    notes: entry.notes || "",
  };
  formError.value = "";
  showEntryModal.value = true;
}

function closeEntryModal() {
  showEntryModal.value = false;
  resetEntryForm();
}

function openCategoryModal() {
  categoryError.value = "";
  showCategoryManager.value = true;
}

function closeCategoryModal() {
  showCategoryManager.value = false;
  cancelCategoryEdit();
}

function openCategoryEditor(category: FinancialCategory) {
  editingCategoryId.value = category.id;
  editingCategoryName.value = category.name;
  categoryError.value = "";
}

function cancelCategoryEdit() {
  editingCategoryId.value = null;
  editingCategoryName.value = "";
  categoryError.value = "";
}

async function loadEntries() {
  loading.value = true;
  error.value = "";

  try {
    const params = buildEntryQueryParams();

    const response = await api.get<{
      entries: FinancialEntry[];
      total: number;
      limit: number;
      offset: number;
    }>(`/accounts/entries?${params.toString()}`);
    entries.value = response.entries;
    total.value = response.total;
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      error.value = "pro_required";
    } else {
      error.value =
        err instanceof Error ? err.message : "Failed to load entries";
    }
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const response = await api.get<{ stats: LedgerStats }>(
      `/accounts/stats?entryType=${activeTab.value}`,
    );
    stats.value = response.stats;
  } catch {
    stats.value = null;
  }
}

async function loadCategories() {
  try {
    const response = await api.get<{ categories: FinancialCategory[] }>(
      `/accounts/categories?entryType=${activeTab.value}`,
    );
    categories.value = response.categories;
  } catch {
    categories.value = [];
  }
}

async function loadStripeStatus() {
  if (activeTab.value !== "income") {
    stripeStatus.value = null;
    return;
  }

  try {
    stripeStatus.value = await api.get<StripeStatus>("/accounts/stripe/status");
  } catch {
    stripeStatus.value = null;
  }
}

async function syncStripeIncome() {
  syncingStripe.value = true;
  stripeSyncResult.value = null;
  stripeSyncError.value = "";

  try {
    const result = await api.post<
      StripeSyncResult & {
        ok: boolean;
        status: string;
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
      }
    >("/accounts/stripe/sync");

    stripeSyncResult.value = {
      chargesImported: result.chargesImported,
      chargesUpdated: result.chargesUpdated,
      chargesSkipped: result.chargesSkipped,
      chargesProcessed: result.chargesProcessed,
      refundsImported: result.refundsImported,
      refundsUpdated: result.refundsUpdated,
      refundsSkipped: result.refundsSkipped,
      refundsProcessed: result.refundsProcessed,
      lastSyncedAt: result.lastSyncedAt,
    };

    if (stripeStatus.value) {
      stripeStatus.value = {
        ...stripeStatus.value,
        status: result.status,
        chargesEnabled: result.chargesEnabled,
        payoutsEnabled: result.payoutsEnabled,
        syncReady: result.chargesEnabled,
        lastSyncedAt: result.lastSyncedAt,
      };
    }

    await Promise.all([loadEntries(), loadStats(), loadStripeStatus()]);
  } catch (err) {
    stripeSyncError.value =
      err instanceof Error ? err.message : "Failed to sync Stripe income";
    await loadStripeStatus();
  } finally {
    syncingStripe.value = false;
  }
}

async function refreshTabData() {
  await Promise.all([
    loadEntries(),
    loadStats(),
    loadCategories(),
    loadStripeStatus(),
  ]);
}

function switchTab(tab: EntryType) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  offset.value = 0;
  categoryFilter.value = "";
  closeCategoryModal();
  closeEntryModal();
  importResult.value = null;
  importError.value = "";
  stripeSyncResult.value = null;
  stripeSyncError.value = "";
  void refreshTabData();
}

function previousPage() {
  if (!hasPreviousPage.value) return;
  offset.value = Math.max(0, offset.value - limit);
  void loadEntries();
}

function nextPage() {
  if (!hasNextPage.value) return;
  offset.value += limit;
  void loadEntries();
}

async function submitEntryForm() {
  formError.value = "";
  const parsedAmount = Number.parseFloat(form.value.amount);

  if (!form.value.description.trim()) {
    formError.value = "Description is required.";
    return;
  }

  if (!form.value.date) {
    formError.value = "Date is required.";
    return;
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    formError.value = "Amount must be greater than zero.";
    return;
  }

  saving.value = true;
  try {
    const payload = {
      entryType: activeTab.value,
      date: form.value.date,
      description: form.value.description.trim(),
      categoryId: form.value.categoryId || null,
      amountCents: Math.round(parsedAmount * 100),
      currency: form.value.currency.trim().toUpperCase() || "USD",
      status: form.value.status,
      notes: form.value.notes.trim() || null,
    };

    if (editingEntryId.value) {
      await api.put(`/accounts/entries/${editingEntryId.value}`, payload);
    } else {
      await api.post("/accounts/entries", payload);
    }

    closeEntryModal();
    await Promise.all([loadEntries(), loadStats()]);
  } catch (err) {
    formError.value =
      err instanceof Error ? err.message : "Failed to save entry";
  } finally {
    saving.value = false;
  }
}

async function removeEntry(entry: FinancialEntry) {
  if (!window.confirm(`Delete "${entry.description}"?`)) return;

  saving.value = true;
  try {
    await api.delete(`/accounts/entries/${entry.id}`);

    if (entries.value.length === 1 && offset.value > 0) {
      offset.value = Math.max(0, offset.value - limit);
    }

    await Promise.all([loadEntries(), loadStats()]);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to delete entry";
  } finally {
    saving.value = false;
  }
}

async function createCategory() {
  const name = categoryDraftName.value.trim();
  if (!name) {
    categoryError.value = "Category name is required.";
    return;
  }

  saving.value = true;
  categoryError.value = "";
  try {
    await api.post("/accounts/categories", {
      name,
      entryType: activeTab.value,
    });
    categoryDraftName.value = "";
    await Promise.all([loadCategories(), loadEntries(), loadStats()]);
  } catch (err) {
    categoryError.value =
      err instanceof Error ? err.message : "Failed to create category";
  } finally {
    saving.value = false;
  }
}

async function saveCategory(category: FinancialCategory) {
  const name = editingCategoryName.value.trim();
  if (!name) {
    categoryError.value = "Category name is required.";
    return;
  }

  saving.value = true;
  categoryError.value = "";
  try {
    await api.put(`/accounts/categories/${category.id}`, {
      name,
      entryType: category.entryType,
      sortOrder: category.sortOrder,
    });
    cancelCategoryEdit();
    await Promise.all([loadCategories(), loadEntries(), loadStats()]);
  } catch (err) {
    categoryError.value =
      err instanceof Error ? err.message : "Failed to update category";
  } finally {
    saving.value = false;
  }
}

async function removeCategory(category: FinancialCategory) {
  if (
    !window.confirm(
      `Delete category "${category.name}"? Existing entries will become uncategorized.`,
    )
  ) {
    return;
  }

  saving.value = true;
  categoryError.value = "";
  try {
    await api.delete(`/accounts/categories/${category.id}`);
    cancelCategoryEdit();
    if (categoryFilter.value === category.id) {
      categoryFilter.value = "";
    }
    await Promise.all([loadCategories(), loadEntries(), loadStats()]);
  } catch (err) {
    categoryError.value =
      err instanceof Error ? err.message : "Failed to delete category";
  } finally {
    saving.value = false;
  }
}

function triggerImport() {
  importFileInput.value?.click();
}

async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  importing.value = true;
  importResult.value = null;
  importError.value = "";

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entryType", activeTab.value);

    const result = await api.upload<{
      ok: boolean;
      imported: number;
      skipped: number;
      total: number;
      errors: Array<{ row: number; reason: string }>;
    }>("/accounts/import", formData);

    importResult.value = {
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
      errors: result.errors || [],
    };

    await Promise.all([loadEntries(), loadStats(), loadCategories()]);
  } catch (err) {
    importError.value =
      err instanceof Error ? err.message : "Failed to import CSV";
  } finally {
    importing.value = false;
    input.value = "";
  }
}

async function exportEntries() {
  exporting.value = true;
  importError.value = "";

  try {
    const params = buildEntryQueryParams(false);
    const response = await fetch(
      `${API_BASE}/accounts/export?${params.toString()}`,
      { credentials: "include" },
    );

    if (!response.ok) {
      const text = await response.text();
      let message = "Export failed";
      try {
        const data = JSON.parse(text) as { error?: string };
        message = data.error || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `accounts-${activeTab.value}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    importError.value =
      err instanceof Error ? err.message : "Failed to export CSV";
  } finally {
    exporting.value = false;
  }
}

let searchDebounce: number | undefined;
watch(searchQuery, () => {
  if (searchDebounce) {
    window.clearTimeout(searchDebounce);
  }

  searchDebounce = window.setTimeout(() => {
    offset.value = 0;
    void loadEntries();
  }, 250);
});

watch([categoryFilter, statusFilter, sourceFilter], () => {
  offset.value = 0;
  void loadEntries();
});

onMounted(() => {
  void refreshTabData();
});
</script>

<template>
  <div class="accounts-page">
    <Teleport to="#app-side-nav-mobile-page-controls">
      <label class="accounts-mobile-search">
        <UiIcon name="Search" :size="14" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          aria-label="Search ledger"
          :placeholder="
            activeTab === 'income'
              ? 'Search payments, notes...'
              : 'Search vendors, notes...'
          "
        />
      </label>
    </Teleport>

    <main class="accounts-main">
      <div v-if="error === 'pro_required'" class="state-card">
        <p><strong>Accounts is available on Pro.</strong></p>
        <p class="state-sub">
          Upgrade to unlock your ledger, Stripe income sync, and invoice triage.
        </p>
      </div>

      <template v-else>
        <section
          v-if="stats"
          class="stats-grid stats-grid--three stats-grid--compact"
        >
          <article class="stat-card stat-card--summary">
            <p>
              <strong>{{ accountSummaryLines.thisMonth }}</strong>
              <span>this month</span>
            </p>
            <p>
              <strong>{{ accountSummaryLines.lastMonth }}</strong>
              <span>last month</span>
            </p>
            <p>
              <strong>{{ stripeSummaryStatus }}</strong>
              <Button
                v-if="isIncomeTab && stripeStatus?.connected"
                variant="primary"
                size="small"
                :disabled="syncingStripe || !stripeStatus.syncReady"
                @click="syncStripeIncome"
              >
                {{ syncingStripe ? "Syncing..." : "Sync" }}
              </Button>
            </p>
          </article>

          <article
            v-for="card in monthStatCards"
            :key="card.label"
            class="stat-card stat-card--compact"
          >
            <p class="stat-label">{{ card.label }}</p>
            <p class="stat-value">{{ card.value }}</p>
            <p class="stat-note">{{ card.note }}</p>
          </article>

          <article
            v-if="isIncomeTab"
            class="stat-card stat-card--stripe stat-card--compact"
          >
            <template v-if="stripeStatus">
              <div class="stripe-card__head">
                <p class="stat-label">Stripe</p>
                <div v-if="stripeStatus.connected" class="stripe-card__sync">
                  <Button
                    variant="primary"
                    size="small"
                    :disabled="syncingStripe || !stripeStatus.syncReady"
                    @click="syncStripeIncome"
                  >
                    {{ syncingStripe ? "Syncing..." : "Sync" }}
                  </Button>
                </div>
              </div>
              <p class="stat-value stat-value--stripe">
                {{
                  !stripeStatus.connected
                    ? "Not connected"
                    : !stripeStatus.syncReady
                      ? "Setup incomplete"
                      : "Connected"
                }}
              </p>
              <p v-if="!stripeStatus.connected" class="stat-note">
                Connect Stripe to import charges.
              </p>

              <ul
                v-if="stripeStatus.connected && stripePayoutPreview.length > 0"
                class="stripe-payout-lines"
              >
                <li
                  v-for="(payout, index) in stripePayoutPreview"
                  :key="payout.id"
                  class="stripe-payout-lines__row"
                  :class="{ 'stripe-payout-lines__row--lead': index === 0 }"
                >
                  {{ stripePayoutPreviewLine(payout, index) }}
                </li>
              </ul>

              <p
                v-if="
                  stripeStatus.connected &&
                  !stripeStatus.syncReady &&
                  stripeStatus.requirementsDue?.length
                "
                class="stat-note stat-note--compact-warn"
              >
                {{ stripeStatus.requirementsDue.slice(0, 2).join(", ")
                }}<template v-if="stripeStatus.requirementsDue.length > 2"
                  >…</template
                >
              </p>

              <p v-if="stripeStatus.connected" class="stripe-last-sync">
                {{
                  stripeStatus.lastSyncedAt
                    ? `Last sync ${formatDateTime(stripeStatus.lastSyncedAt)}`
                    : formatDateTime(null)
                }}
              </p>

              <p v-if="stripeSyncResult" class="stripe-inline-result">
                {{ stripeSyncResult.chargesImported }} new charges ·
                {{ stripeSyncResult.refundsImported }} new refunds
              </p>
              <p
                v-if="stripeSyncError"
                class="stripe-inline-result stripe-inline-result--error"
              >
                {{ stripeSyncError }}
              </p>
            </template>
            <template v-else>
              <p class="stat-label">Stripe</p>
              <p class="stat-value">—</p>
              <p class="stat-note">Status unavailable.</p>
            </template>
          </article>

          <article
            v-else-if="expenseTopCategoryCard"
            class="stat-card stat-card--compact"
          >
            <p class="stat-label">{{ expenseTopCategoryCard.label }}</p>
            <p class="stat-value">{{ expenseTopCategoryCard.value }}</p>
            <p class="stat-note">{{ expenseTopCategoryCard.note }}</p>
          </article>
        </section>

        <section v-if="importResult || importError" class="import-card">
          <div v-if="importResult" class="import-result">
            <div class="import-result__copy">
              <strong>
                Imported {{ importResult.imported }} of
                {{ importResult.total }} row{{
                  importResult.total === 1 ? "" : "s"
                }}.
              </strong>
              <span v-if="importResult.skipped > 0">
                {{ importResult.skipped }} skipped.
              </span>
            </div>
            <button
              class="dismiss-btn"
              type="button"
              @click="importResult = null"
            >
              ×
            </button>
          </div>

          <div v-if="importError" class="import-result import-result--error">
            <div class="import-result__copy">
              <strong>{{ importError }}</strong>
            </div>
            <button class="dismiss-btn" type="button" @click="importError = ''">
              ×
            </button>
          </div>

          <div v-if="importResult?.errors?.length" class="import-errors">
            <p class="import-errors__title">Skipped rows</p>
            <ul>
              <li
                v-for="item in importResult.errors.slice(0, 6)"
                :key="`${item.row}-${item.reason}`"
              >
                Row {{ item.row }}: {{ item.reason }}
              </li>
            </ul>
            <p
              v-if="importResult.errors.length > 6"
              class="import-errors__more"
            >
              Showing the first 6 issues of {{ importResult.errors.length }}.
            </p>
          </div>
        </section>

        <section class="ledger-toolbar" aria-label="Ledger filters and actions">
          <div class="ledger-toolbar__top">
            <div class="tab-bar" role="tablist" aria-label="Ledger type">
              <button
                class="tab-btn"
                role="tab"
                type="button"
                :class="{ 'tab-btn--active': activeTab === 'income' }"
                :aria-selected="activeTab === 'income'"
                @click="switchTab('income')"
              >
                Income
              </button>
              <button
                class="tab-btn"
                role="tab"
                type="button"
                :class="{ 'tab-btn--active': activeTab === 'expense' }"
                :aria-selected="activeTab === 'expense'"
                @click="switchTab('expense')"
              >
                Expenses
              </button>
            </div>

            <div class="toolbar-actions toolbar-actions--wrap">
              <div class="import-csv-group">
                <Button
                  variant="outline"
                  size="small"
                  :disabled="importing"
                  @click="triggerImport"
                >
                  {{ importing ? "Importing..." : "Import CSV" }}
                </Button>
                <div class="import-csv-tooltip">
                  <button
                    type="button"
                    class="import-csv-tooltip__trigger"
                    aria-label="CSV column requirements"
                    aria-describedby="accounts-csv-import-help"
                  >
                    ?
                  </button>
                  <div
                    id="accounts-csv-import-help"
                    class="import-csv-tooltip__content"
                    role="tooltip"
                  >
                    CSV import expects
                    <code>date</code>, <code>description</code>, and
                    <code>amount</code> columns. Optional:
                    <code>category</code>, <code>currency</code>,
                    <code>status</code>, and <code>notes</code>.
                  </div>
                </div>
                <input
                  ref="importFileInput"
                  type="file"
                  accept=".csv,text/csv"
                  class="hidden-file-input"
                  @change="handleImportFile"
                />
              </div>
              <Button
                variant="outline"
                size="small"
                :disabled="exporting"
                @click="exportEntries"
              >
                {{ exporting ? "Exporting..." : "Export CSV" }}
              </Button>
              <Button variant="outline" size="small" @click="openCategoryModal">
                Categories
              </Button>
              <Button variant="primary" size="small" @click="openCreateModal">
                {{ activeTab === "income" ? "Add income" : "Add expense" }}
              </Button>
            </div>
          </div>

          <div class="ledger-toolbar__filters">
            <label class="search-field search-field--toolbar">
              <span class="sr-only">Search ledger</span>
              <UiIcon name="Search" :size="14" aria-hidden="true" />
              <input
                v-model="searchQuery"
                type="search"
                :placeholder="
                  activeTab === 'income'
                    ? 'Search payments, notes…'
                    : 'Search vendors, notes…'
                "
              />
            </label>

            <div class="filter-group filter-group--toolbar">
              <label class="filter-field">
                <span class="filter-field__label">Category</span>
                <select v-model="categoryFilter" class="filter-select">
                  <option value="">All</option>
                  <option
                    v-for="category in currentCategories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </label>

              <label class="filter-field">
                <span class="filter-field__label">Status</span>
                <select v-model="statusFilter" class="filter-select">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="needs_review">Needs review</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>

              <label class="filter-field">
                <span class="filter-field__label">Source</span>
                <select v-model="sourceFilter" class="filter-select">
                  <option value="">All</option>
                  <option value="manual">Manual</option>
                  <option value="email_triage">Email triage</option>
                  <option value="stripe">Stripe</option>
                  <option value="csv_import">CSV import</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section class="table-card">
          <div
            v-if="error && error !== 'pro_required'"
            class="state-card state-card--error"
          >
            {{ error }}
          </div>

          <div v-else-if="loading" class="state-card">Loading ledger…</div>

          <template v-else>
            <table class="ledger-table">
              <thead>
                <tr>
                  <th
                    v-for="header in table.getFlatHeaders()"
                    :key="header.id"
                    :style="
                      header.column.columnDef.size
                        ? `width: ${header.column.columnDef.size}px`
                        : ''
                    "
                    :class="[
                      header.column.getCanSort() ? 'col-sortable' : '',
                      header.column.id === 'status' ||
                      header.column.id === 'source'
                        ? 'col-center'
                        : '',
                    ]"
                    @click="header.column.getToggleSortingHandler()?.($event)"
                  >
                    {{ header.column.columnDef.header as string }}
                    <span
                      v-if="
                        header.column.getCanSort() &&
                        header.column.getIsSorted()
                      "
                      class="sort-indicator"
                    >
                      {{ header.column.getIsSorted() === "asc" ? "↑" : "↓" }}
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody v-if="table.getRowModel().rows.length > 0">
                <tr
                  v-for="row in table.getRowModel().rows"
                  :key="row.id"
                  class="ledger-row"
                >
                  <td class="cell-date">{{ formatDate(row.original.date) }}</td>
                  <td>
                    <div class="primary-cell">
                      <strong>{{ row.original.description }}</strong>
                      <span class="subtle-text">
                        {{
                          row.original.entryType === "income"
                            ? "Income"
                            : "Expense"
                        }}
                      </span>
                    </div>
                  </td>
                  <td class="amount-cell">
                    {{
                      formatCurrency(
                        row.original.amountCents,
                        row.original.currency,
                      )
                    }}
                  </td>
                  <td class="cell-badge">
                    <span
                      class="ledger-status-badge"
                      :class="statusBadgeClass(row.original.status)"
                    >
                      {{ STATUS_LABELS[row.original.status] }}
                    </span>
                  </td>
                  <td class="cell-badge">
                    <span
                      class="ledger-source-badge"
                      :class="sourceBadgeClass(row.original.source)"
                    >
                      {{ SOURCE_LABELS[row.original.source] }}
                    </span>
                  </td>
                  <td class="notes-cell">
                    {{ row.original.notes || "—" }}
                  </td>
                  <td>
                    <div class="row-actions">
                      <Button
                        size="small"
                        variant="outline"
                        @click="openEditModal(row.original)"
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outline"
                        @click="removeEntry(row.original)"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              v-if="table.getRowModel().rows.length === 0"
              class="empty-state"
            >
              <p>
                {{
                  activeTab === "income"
                    ? "No income entries yet."
                    : "No expense entries yet."
                }}
              </p>
              <p class="empty-state__sub">
                {{
                  activeTab === "income"
                    ? "Add income above, or use import a CSV to fill this ledger."
                    : "Add expenses above, or import a CSV to fill this ledger."
                }}
              </p>
            </div>

            <div class="pagination-row">
              <div class="pagination-copy">
                Page {{ currentPage }} of {{ pageCount }} · {{ total }} total
                entries
              </div>
              <div class="pagination-actions">
                <Button
                  size="small"
                  variant="outline"
                  :disabled="!hasPreviousPage"
                  @click="previousPage"
                >
                  Previous
                </Button>
                <Button
                  size="small"
                  variant="outline"
                  :disabled="!hasNextPage"
                  @click="nextPage"
                >
                  Next
                </Button>
              </div>
            </div>
          </template>
        </section>
      </template>
    </main>

    <div
      v-if="showEntryModal"
      class="modal-overlay"
      @click.self="closeEntryModal"
    >
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <h2>
              {{
                editingEntryId
                  ? "Edit entry"
                  : activeTab === "income"
                    ? "Add income"
                    : "Add expense"
              }}
            </h2>
          </div>
          <button class="icon-close" type="button" @click="closeEntryModal">
            ×
          </button>
        </div>

        <form class="entry-form" @submit.prevent="submitEntryForm">
          <div class="field-grid">
            <label>
              <span>Date</span>
              <input v-model="form.date" type="date" required />
            </label>

            <label>
              <span>Amount</span>
              <input
                v-model="form.amount"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
            </label>

            <label>
              <span>Currency</span>
              <input
                v-model="form.currency"
                type="text"
                maxlength="3"
                placeholder="USD"
                required
              />
            </label>

            <label>
              <span>Status</span>
              <select v-model="form.status">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="needs_review">Needs review</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <label>
            <span>Description</span>
            <input
              v-model="form.description"
              type="text"
              maxlength="180"
              :placeholder="
                activeTab === 'income'
                  ? 'Consulting payment'
                  : 'Vercel Pro invoice'
              "
              required
            />
          </label>

          <label>
            <span>Category</span>
            <select v-model="form.categoryId">
              <option value="">Uncategorized</option>
              <option
                v-for="category in currentCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </label>

          <label>
            <span>Notes</span>
            <textarea
              v-model="form.notes"
              rows="4"
              placeholder="Optional notes"
            />
          </label>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <div class="modal-actions">
            <Button
              type="button"
              variant="outline"
              :disabled="saving"
              @click="closeEntryModal"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" :disabled="saving">
              {{
                saving
                  ? "Saving…"
                  : editingEntryId
                    ? "Save changes"
                    : activeTab === "income"
                      ? "Add income"
                      : "Add expense"
              }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showCategoryManager"
      class="modal-overlay"
      @click.self="closeCategoryModal"
    >
      <div
        class="modal-card modal-card--categories"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounts-category-modal-title"
      >
        <div class="modal-header">
          <div>
            <h2 id="accounts-category-modal-title">Manage categories</h2>
          </div>
          <button
            class="icon-close"
            type="button"
            aria-label="Close"
            @click="closeCategoryModal"
          >
            ×
          </button>
        </div>

        <div class="category-modal-body">
          <div class="category-list">
            <div
              v-for="category in currentCategories"
              :key="category.id"
              class="category-row"
            >
              <template v-if="editingCategoryId === category.id">
                <input
                  v-model="editingCategoryName"
                  type="text"
                  class="category-input"
                  maxlength="80"
                />
                <div class="category-actions">
                  <Button
                    size="small"
                    variant="primary"
                    @click="saveCategory(category)"
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    variant="outline"
                    @click="cancelCategoryEdit"
                  >
                    Cancel
                  </Button>
                </div>
              </template>

              <template v-else>
                <span class="category-name">{{ category.name }}</span>
                <div class="category-actions">
                  <Button
                    size="small"
                    variant="outline"
                    @click="openCategoryEditor(category)"
                  >
                    Rename
                  </Button>
                  <Button
                    size="small"
                    variant="outline"
                    @click="removeCategory(category)"
                  >
                    Delete
                  </Button>
                </div>
              </template>
            </div>
          </div>

          <form class="category-create-row" @submit.prevent="createCategory">
            <input
              v-model="categoryDraftName"
              type="text"
              maxlength="80"
              placeholder="Add a new category"
            />
            <Button type="submit" variant="primary" size="small">Add</Button>
          </form>

          <p v-if="categoryError" class="form-error">{{ categoryError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accounts-page {
  min-height: 100vh;
}

.accounts-main {
  margin: 0 auto;
  padding: 24px 40px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-card,
.state-card,
.stat-card {
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-bg);
}

.stat-card--compact {
  border-radius: 8px;
}

.stat-card--summary,
.accounts-mobile-search {
  display: none;
}

.table-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
}

.ledger-toolbar {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ledger-toolbar__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ledger-toolbar__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}

.toolbar-actions,
.pagination-actions,
.row-actions,
.category-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-actions--wrap {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hidden-file-input {
  display: none;
}

.tab-bar {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text-muted);
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s,
    border-color 0.12s;
}

.tab-btn:hover {
  color: var(--color-text);
  border-color: var(--color-text);
}

.tab-btn--active {
  background: var(--color-text);
  border-color: var(--color-text);
  color: var(--color-bg);
}

.tab-btn--active:hover {
  color: var(--color-bg);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.stats-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.stats-grid--compact {
  align-items: stretch;
}

.stat-card,
.import-card {
  padding: 18px 20px;
}

.stat-card--compact {
  padding: 10px 12px;
}

.stat-label {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.stat-card--compact .stat-label {
  margin: 0 0 4px;
  font-size: 10px;
}

.stat-value {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text);
}

.stat-value--stripe {
  word-break: break-word;
}

.stat-card h2,
.modal-header h2 {
  margin: 0;
  font-size: 22px;
}

.stat-note,
.state-sub {
  margin: 8px 0 0;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.stat-card--compact .stat-note {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.35;
}

.stat-note--compact-warn {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: #8a6100;
}

.stat-card--stripe {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.stripe-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.stripe-card__head .stat-label {
  margin-bottom: 0;
}

.stripe-card__sync {
  flex-shrink: 0;
}

.stripe-payout-lines {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;
}

.stripe-payout-lines__row {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stripe-payout-lines__row--lead {
  font-weight: 700;
}

.stripe-payout-lines__row:not(.stripe-payout-lines__row--lead) {
  font-weight: 600;
  color: var(--color-text-muted);
}

.stripe-last-sync {
  margin: 6px 0 0;
  padding-top: 6px;
  border-top: 1px solid var(--color-border);
  font-size: 10px;
  line-height: 1.35;
  color: var(--color-text-muted);
  opacity: 0.72;
}

.stripe-inline-result {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.stripe-inline-result--error {
  color: #b42318;
}

.import-card {
  display: grid;
  gap: 12px;
}

.import-result {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.02);
}

.import-result--error {
  border-color: rgba(180, 35, 24, 0.2);
  color: #b42318;
  background: rgba(180, 35, 24, 0.04);
}

.import-result__copy {
  display: grid;
  gap: 4px;
}

.dismiss-btn {
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

.import-errors {
  padding: 0 2px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.import-errors__title,
.import-errors__more {
  margin: 0;
}

.import-errors ul {
  margin: 8px 0 0;
  padding-left: 18px;
}

.import-errors__more {
  margin-top: 8px;
}

.import-csv-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.import-csv-tooltip {
  position: relative;
}

.import-csv-tooltip__trigger {
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
}

.import-csv-tooltip__trigger:hover {
  color: var(--color-text);
}

.import-csv-tooltip__trigger:focus-visible {
  color: var(--color-text);
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.import-csv-tooltip__content {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: min(72vw, 280px);
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 5;
}

.import-csv-tooltip__content code {
  font-size: 11px;
}

.import-csv-tooltip:hover .import-csv-tooltip__content,
.import-csv-tooltip:focus-within .import-csv-tooltip__content {
  opacity: 1;
  visibility: visible;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 380px;
  padding: 0 14px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.search-field--toolbar {
  min-width: min(100%, 200px);
  flex: 1 1 180px;
  max-width: 280px;
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  gap: 8px;
}

.search-field--toolbar input {
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

.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.filter-group--toolbar {
  gap: 8px;
  flex-wrap: wrap;
  flex: 1 1 auto;
  justify-content: flex-end;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-field__label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.filter-select {
  min-height: 34px;
  padding: 5px 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}

.entry-form label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.entry-form input,
.entry-form select,
.entry-form textarea,
.category-create-row input,
.category-input {
  min-height: 42px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  padding: 10px 12px;
}

.entry-form textarea {
  min-height: 108px;
  resize: vertical;
}

.table-card {
  overflow: hidden;
}

/* TanStack-driven ledger table — aligned with agent messages + job runs tables */
.ledger-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
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
  vertical-align: middle;
}

.ledger-table th.col-center {
  text-align: center;
}

.ledger-table th.col-sortable {
  cursor: pointer;
}

.ledger-table th.col-sortable:hover {
  color: var(--color-text);
}

.sort-indicator {
  margin-left: 4px;
  font-size: 10px;
  color: var(--color-text-muted);
}

.ledger-row td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.ledger-row:last-child td {
  border-bottom: none;
}

.cell-date {
  color: var(--color-text-muted);
  font-size: 12px;
  white-space: nowrap;
}

.primary-cell {
  display: grid;
  gap: 4px;
}

.subtle-text,
.notes-cell {
  color: var(--color-text-muted);
}

.amount-cell {
  white-space: nowrap;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cell-badge {
  text-align: center;
}

.ledger-status-badge,
.ledger-source-badge {
  display: inline-block;
  max-width: 100%;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

/* Entry status — compact, colour-coded */
.ledger-status-badge--pending {
  background: rgba(0, 0, 0, 0.06);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.ledger-status-badge--paid {
  background: #e6f4ea;
  color: #1a7f3c;
  border: 1px solid rgba(26, 127, 60, 0.25);
}

.ledger-status-badge--overdue {
  background: #fdecea;
  color: #b33b2e;
  border: 1px solid rgba(179, 59, 46, 0.35);
}

.ledger-status-badge--cancelled {
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.ledger-status-badge--needs_review {
  background: #fff8e6;
  color: #8a6100;
  border: 1px solid rgba(138, 97, 0, 0.28);
}

/* Source — distinct tints */
.ledger-source-badge--manual {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.ledger-source-badge--email_triage {
  background: #e8f0fe;
  color: #1a56c9;
  border: 1px solid rgba(26, 86, 201, 0.22);
}

.ledger-source-badge--stripe {
  background: #ede7f6;
  color: #5e35b1;
  border: 1px solid rgba(94, 53, 177, 0.22);
}

.ledger-source-badge--csv_import {
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.state-card {
  display: grid;
  gap: 12px;
  padding: 40px 24px;
  text-align: center;
}

.empty-state {
  padding: 32px 20px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.empty-state p {
  margin: 0;
}

.empty-state p + p {
  margin-top: 8px;
}

.empty-state__sub {
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-muted);
  opacity: 0.88;
}

.state-card--error {
  color: #b42318;
  border-color: rgba(180, 35, 24, 0.2);
  margin: 18px;
}

.pagination-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-top: 1px solid var(--color-border);
}

.pagination-copy {
  color: var(--color-text-muted);
  font-size: 12px;
}

.category-list {
  display: grid;
  gap: 12px;
}

.category-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border);
}

.category-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.category-name {
  font-weight: 600;
}

.category-create-row {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.category-create-row input {
  flex: 1;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.32);
}

.modal-card {
  width: min(100%, 720px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  background: var(--color-bg);
  padding: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
}

.modal-card--categories {
  width: min(100%, 520px);
  max-height: min(90vh, 640px);
  display: flex;
  flex-direction: column;
}

.category-modal-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.icon-close {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 28px;
  cursor: pointer;
}

.entry-form {
  display: grid;
  gap: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-error {
  margin: 0;
  color: #b42318;
  font-size: 14px;
}

@media (max-width: 960px) {
  .ledger-toolbar__top {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-actions--wrap {
    justify-content: flex-start;
  }

  .ledger-toolbar__filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group--toolbar {
    justify-content: flex-start;
  }

  .pagination-row,
  .category-row,
  .category-create-row {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid--three {
    grid-template-columns: 1fr;
  }

  .search-field {
    min-width: 0;
  }

  .search-field--toolbar {
    max-width: none;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .accounts-main {
    padding: 16px 16px 40px;
  }

  .stats-grid--compact {
    display: block;
  }

  .stats-grid--compact > .stat-card:not(.stat-card--summary) {
    display: none;
  }

  .stat-card--summary {
    display: grid;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
  }

  .stat-card--summary p {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0;
    color: var(--color-text-muted);
    font-size: 13px;
    line-height: 1.35;
  }

  .stat-card--summary strong {
    color: var(--color-text);
    font-size: 14px;
  }

  .stat-card--summary span {
    flex: 1;
    text-align: left;
  }

  .ledger-toolbar .search-field--toolbar {
    display: none;
  }

  .accounts-mobile-search {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-width: 0;
    height: 40px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg);
    color: var(--color-text-muted);
  }

  .accounts-mobile-search input {
    min-width: 0;
    width: 100%;
    border: 0;
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: 13px;
  }

  .accounts-mobile-search input:focus {
    outline: none;
  }

  .ledger-table th,
  .ledger-table td {
    padding: 8px 8px;
    font-size: 13px;
  }

  .row-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
