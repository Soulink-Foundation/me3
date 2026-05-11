export const STRIPE_CONNECT_COUNTRIES = [
  { value: "AU", label: "Australia" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "BG", label: "Bulgaria" },
  { value: "CA", label: "Canada" },
  { value: "HR", label: "Croatia" },
  { value: "CY", label: "Cyprus" },
  { value: "CZ", label: "Czech Republic" },
  { value: "DK", label: "Denmark" },
  { value: "EE", label: "Estonia" },
  { value: "FI", label: "Finland" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "GI", label: "Gibraltar" },
  { value: "GR", label: "Greece" },
  { value: "HK", label: "Hong Kong" },
  { value: "HU", label: "Hungary" },
  { value: "IE", label: "Ireland" },
  { value: "IT", label: "Italy" },
  { value: "JP", label: "Japan" },
  { value: "LV", label: "Latvia" },
  { value: "LI", label: "Liechtenstein" },
  { value: "LT", label: "Lithuania" },
  { value: "LU", label: "Luxembourg" },
  { value: "MT", label: "Malta" },
  { value: "MX", label: "Mexico" },
  { value: "NL", label: "Netherlands" },
  { value: "NZ", label: "New Zealand" },
  { value: "NO", label: "Norway" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "RO", label: "Romania" },
  { value: "SG", label: "Singapore" },
  { value: "SK", label: "Slovakia" },
  { value: "SI", label: "Slovenia" },
  { value: "ES", label: "Spain" },
  { value: "SE", label: "Sweden" },
  { value: "CH", label: "Switzerland" },
  { value: "GB", label: "United Kingdom" },
  { value: "US", label: "United States" },
] as const;

const STRIPE_CONNECT_COUNTRY_SET = new Set<string>(
  STRIPE_CONNECT_COUNTRIES.map((country) => country.value),
);

const STORAGE_KEY = "me3.stripeConnectCountry";
const DEFAULT_COUNTRY = "IE";

function inferCountryFromNavigator() {
  if (typeof navigator === "undefined") {
    return DEFAULT_COUNTRY;
  }

  const locales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const locale of locales) {
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && STRIPE_CONNECT_COUNTRY_SET.has(region)) {
      return region;
    }
  }

  return DEFAULT_COUNTRY;
}

export function getInitialStripeConnectCountry() {
  if (typeof window === "undefined") {
    return DEFAULT_COUNTRY;
  }

  const storedCountry = window.localStorage.getItem(STORAGE_KEY)?.toUpperCase();
  if (storedCountry && STRIPE_CONNECT_COUNTRY_SET.has(storedCountry)) {
    return storedCountry;
  }

  return inferCountryFromNavigator();
}

export function persistStripeConnectCountry(country: string) {
  const normalizedCountry = country.toUpperCase();
  if (
    typeof window !== "undefined" &&
    STRIPE_CONNECT_COUNTRY_SET.has(normalizedCountry)
  ) {
    window.localStorage.setItem(STORAGE_KEY, normalizedCountry);
  }
}
