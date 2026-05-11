import { computed, ref } from "vue";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "me3-theme";
const theme = ref<ThemeMode>("light");

let initialized = false;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setStoredTheme(nextTheme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage failures (private mode, disabled storage, etc.).
  }
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(nextTheme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", nextTheme);
  root.style.colorScheme = nextTheme;
}

function initTheme(): void {
  if (initialized) return;
  theme.value = getStoredTheme() ?? getSystemTheme();
  applyTheme(theme.value);
  initialized = true;
}

function setTheme(nextTheme: ThemeMode): void {
  theme.value = nextTheme;
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
    isDark: computed(() => theme.value === "dark"),
    initTheme,
    setTheme,
    toggleTheme,
  };
}
