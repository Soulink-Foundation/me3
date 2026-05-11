import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "../api";

interface User {
  id: string;
  email: string | null;
  name: string;
  username: string;
  timezone: string | null;
  locale: string;
  localeSource: "explicit" | "inferred";
}

interface OwnerProfile {
  id: string;
  email: string | null;
  name: string;
  username: string;
  timezone: string | null;
}

export interface BootstrapOwnerInput {
  bootstrapCode: string;
  email?: string;
  name: string;
  username: string;
}

const STORAGE_KEY = "me3_core_owner_session";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function ownerToUser(owner: OwnerProfile): User {
  return {
    id: owner.id,
    email: owner.email,
    name: owner.name,
    username: owner.username,
    timezone: owner.timezone,
    locale: "en-US",
    localeSource: "inferred",
  };
}

function readStoredSession(): User | null {
  if (!hasBrowserStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.id || !parsed?.username) return null;
    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(newUser: User) {
  if (!hasBrowserStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
}

function clearStoredSession() {
  if (!hasBrowserStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);
  let initializePromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => !!user.value);

  function setSession(newUser: User) {
    user.value = newUser;
    initialized.value = true;
    writeStoredSession(newUser);
  }

  async function refreshSession(): Promise<boolean> {
    user.value = readStoredSession();
    return Boolean(user.value);
  }

  async function ensureInitialized(): Promise<void> {
    if (initialized.value) {
      return;
    }

    if (!initializePromise) {
      initializePromise = (async () => {
        await refreshSession();
        initialized.value = true;
      })().finally(() => {
        initializePromise = null;
      });
    }

    await initializePromise;
  }

  async function bootstrapOwner(input: BootstrapOwnerInput): Promise<boolean> {
    try {
      const response = await api.post<{ ok: boolean; owner: OwnerProfile }>(
        "/admin/bootstrap",
        {
          bootstrapCode: input.bootstrapCode,
          email: input.email?.trim() || undefined,
          name: input.name.trim(),
          username: input.username.trim(),
        },
      );

      if (!response.ok) return false;
      setSession(ownerToUser(response.owner));
      return true;
    } catch (error) {
      console.error("Bootstrap owner error:", error);
      return false;
    }
  }

  async function logout() {
    user.value = null;
    initialized.value = true;
    clearStoredSession();
  }

  return {
    user,
    initialized,
    isAuthenticated,
    ensureInitialized,
    refreshSession,
    bootstrapOwner,
    logout,
    setSession,
  };
});
