import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../api";

export type OpsCustomerSite = {
  id: string;
  username: string;
  url: string;
  custom_domain: string | null;
  custom_domain_status: "pending" | "active" | "failed" | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type OpsLifecycleEmail = {
  email_key: "welcome" | "agent_checkin" | "week_recap" | "trial_expiry";
  status: "not_scheduled" | "scheduled" | "due" | "sent" | "skipped";
  scheduled_at: string | null;
  sent_at: string | null;
  skipped_at: string | null;
  skip_reason: string | null;
};

export type OpsCustomer = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  subscription_tier: "free" | "starter" | "pro";
  subscription_status: "active" | "past_due" | "canceled" | "trialing" | null;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connect_status: "pending" | "active" | "restricted" | "rejected" | null;
  billing_source: "stripe" | "manual" | "trial" | "none";
  manual_access_tier: "starter" | "pro" | null;
  manual_access_expires_at: string | null;
  manual_access_granted_at: string | null;
  current_month_email_usage: number;
  lifecycle_emails: OpsLifecycleEmail[];
  site_count: number;
  published_site_count: number;
  custom_domain_count: number;
  latest_published_at: string | null;
  sites: OpsCustomerSite[];
};

export type OpsCustomersResponse = {
  summary: {
    total_customers: number;
    pro_customers: number;
    active_subscriptions: number;
    published_customers: number;
  };
  filters: {
    q: string;
    tier: string | null;
    status: string | null;
    month: string;
  };
  customers: OpsCustomer[];
};

export type OpsLifecyclePreviewResponse = {
  ok: boolean;
  sent: Array<{
    emailKey: OpsLifecycleEmail["email_key"];
    subject: string;
    fromEmail: string;
    replyTo: string | null;
  }>;
};

export type OpsGrantAccessResponse = {
  ok: boolean;
  customer: {
    id: string;
    email: string;
  };
  grant: {
    tier: "starter" | "pro";
    billing_source: "manual";
    expires_at: string;
  };
};

export type OpsDemoSite = {
  id: string;
  user_id: string;
  username: string;
  site_type: "profile" | "landing_page";
  url: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type OpsDemoSitesResponse = {
  sites: OpsDemoSite[];
};

export type OpsCreateDemoSiteResponse = {
  ok: boolean;
  site: OpsDemoSite;
};

export const useOpsStore = defineStore("ops", () => {
  const customers = ref<OpsCustomer[]>([]);
  const summary = ref<OpsCustomersResponse["summary"] | null>(null);
  const filters = ref<OpsCustomersResponse["filters"] | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const accessKnown = ref(false);
  const accessAllowed = ref(false);
  const demoSites = ref<OpsDemoSite[]>([]);
  const demoSitesLoading = ref(false);
  const demoSitesError = ref<string | null>(null);

  async function fetchAccess(): Promise<boolean> {
    try {
      const response = await api.get<{ allowed: boolean }>("/ops/access");
      accessAllowed.value = response.allowed === true;
      accessKnown.value = true;
      return accessAllowed.value;
    } catch {
      accessAllowed.value = false;
      accessKnown.value = true;
      return false;
    }
  }

  async function fetchCustomers(input: {
    q?: string;
    tier?: string;
    status?: string;
  } = {}): Promise<OpsCustomer[]> {
    loading.value = true;
    error.value = null;

    const params = new URLSearchParams();
    if (input.q?.trim()) params.set("q", input.q.trim());
    if (input.tier?.trim()) params.set("tier", input.tier.trim());
    if (input.status?.trim()) params.set("status", input.status.trim());

    const endpoint = params.toString()
      ? `/ops/customers?${params.toString()}`
      : "/ops/customers";

    try {
      const response = await api.get<OpsCustomersResponse>(endpoint);
      customers.value = response.customers || [];
      summary.value = response.summary;
      filters.value = response.filters;
      accessAllowed.value = true;
      accessKnown.value = true;
      return customers.value;
    } catch (e: any) {
      customers.value = [];
      summary.value = null;
      filters.value = null;
      accessKnown.value = true;
      if (e?.status === 403) {
        accessAllowed.value = false;
        error.value = "This area is only available to internal admins.";
      } else {
        error.value = e?.message || "Failed to load customer data";
      }
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function sendLifecyclePreview(
    customerId: string,
    email: string,
  ): Promise<OpsLifecyclePreviewResponse> {
    return api.post<OpsLifecyclePreviewResponse>(
      `/ops/customers/${encodeURIComponent(customerId)}/lifecycle/send-test`,
      { email },
    );
  }

  async function grantCustomerAccess(
    customerId: string,
    tier: "starter" | "pro",
  ): Promise<OpsGrantAccessResponse> {
    return api.post<OpsGrantAccessResponse>(
      `/ops/customers/${encodeURIComponent(customerId)}/grant-access`,
      { tier },
    );
  }

  async function fetchDemoSites(): Promise<OpsDemoSite[]> {
    demoSitesLoading.value = true;
    demoSitesError.value = null;

    try {
      const response = await api.get<OpsDemoSitesResponse>("/ops/demo-sites");
      demoSites.value = response.sites || [];
      accessAllowed.value = true;
      accessKnown.value = true;
      return demoSites.value;
    } catch (e: any) {
      demoSites.value = [];
      accessKnown.value = true;
      if (e?.status === 403) {
        accessAllowed.value = false;
        demoSitesError.value = "This area is only available to internal admins.";
      } else {
        demoSitesError.value = e?.message || "Failed to load demo sites";
      }
      return [];
    } finally {
      demoSitesLoading.value = false;
    }
  }

  async function createDemoSite(
    username: string,
  ): Promise<OpsCreateDemoSiteResponse> {
    const response = await api.post<OpsCreateDemoSiteResponse>(
      "/ops/demo-sites",
      { username },
    );
    const created = response.site;
    demoSites.value = [created, ...demoSites.value.filter((s) => s.id !== created.id)];
    demoSitesError.value = null;
    accessAllowed.value = true;
    accessKnown.value = true;
    return response;
  }

  return {
    customers,
    summary,
    filters,
    loading,
    error,
    accessKnown,
    accessAllowed,
    demoSites,
    demoSitesLoading,
    demoSitesError,
    fetchAccess,
    fetchCustomers,
    grantCustomerAccess,
    sendLifecyclePreview,
    fetchDemoSites,
    createDemoSite,
  };
});
