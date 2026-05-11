export interface SiteAnalyticsSummary {
  hostnames: string[];
  visits: number;
  previousVisits: number | null;
  deltaPercentage: number | null;
  topReferrer: string | null;
  topPage: string | null;
  topCountries: Array<{
    country: string;
    visits: number;
  }>;
}

export interface BusinessPulseStats {
  subscriberCount: number;
  newSubscribers: number;
  bookingsCount: number;
  messagesHandled: number;
  incomeCents: number | null;
  incomeCurrency: string | null;
  socialPublications: number;
}
