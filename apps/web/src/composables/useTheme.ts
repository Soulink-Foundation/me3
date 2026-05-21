import { computed, ref } from "vue";

export type ThemeMode = "light" | "dark";
export type ThemePreference = "light" | "system" | "dark";

const THEME_STORAGE_KEY = "me3-theme";
const theme = ref<ThemeMode>("light");
const themePreference = ref<ThemePreference>("system");

let initialized = false;
let systemThemeQuery: MediaQueryList | null = null;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "system" || value === "dark";
}

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setStoredTheme(nextTheme: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage failures (private mode, disabled storage, etc.).
  }
}

function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(value)) return value;
    if (isThemeMode(value)) return value;
    return "system";
  } catch {
    return "system";
  }
}

function applyTheme(nextTheme: ThemePreference): void {
  const effectiveTheme = nextTheme === "system" ? getSystemTheme() : nextTheme;
  theme.value = effectiveTheme;
  themePreference.value = nextTheme;

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (nextTheme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", nextTheme);
    }
    root.style.colorScheme = effectiveTheme;
  }
}

function syncSystemTheme() {
  if (themePreference.value === "system") {
    applyTheme("system");
  }
}

function initTheme(): void {
  if (initialized) return;
  applyTheme(getStoredTheme());
  if (typeof window !== "undefined") {
    systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemThemeQuery.addEventListener("change", syncSystemTheme);
  }
  initialized = true;
}

function setTheme(nextTheme: ThemeMode): void {
  applyTheme(nextTheme);
  setStoredTheme(nextTheme);
  initialized = true;
}

function setThemePreference(nextTheme: ThemePreference): void {
  applyTheme(nextTheme);
  setStoredTheme(nextTheme);
  initialized = true;
}

function toggleTheme(): void {
  setTheme(theme.value === "dark" ? "light" : "dark");
}

export function useTheme() {
  return {
    theme,
    themePreference,
    isDark: computed(() => theme.value === "dark"),
    initTheme,
    setTheme,
    setThemePreference,
    toggleTheme,
  };
}
