import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "./auth";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    post: vi.fn(),
  },
}));

const storedUser = {
  id: "owner",
  email: "owner@example.com",
  name: "ME3 Core Owner",
  username: "owner",
  timezone: null,
  locale: "en-US",
  localeSource: "inferred" as const,
};

describe("auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("starts unauthenticated before hydration", () => {
      const store = useAuthStore();
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.initialized).toBe(false);
    });

    it("hydrates session from local storage", async () => {
      window.localStorage.setItem(
        "me3_core_owner_session",
        JSON.stringify(storedUser),
      );

      const store = useAuthStore();
      await store.ensureInitialized();

      expect(store.initialized).toBe(true);
      expect(store.user).toEqual(storedUser);
      expect(store.isAuthenticated).toBe(true);
    });

    it("treats missing session as unauthenticated", async () => {
      const store = useAuthStore();
      await store.ensureInitialized();

      expect(store.initialized).toBe(true);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });

    it("does not rehydrate after initialization", async () => {
      window.localStorage.setItem(
        "me3_core_owner_session",
        JSON.stringify(storedUser),
      );

      const store = useAuthStore();
      await store.ensureInitialized();
      window.localStorage.clear();
      await store.ensureInitialized();

      expect(store.user).toEqual(storedUser);
    });
  });

  describe("bootstrapOwner", () => {
    it("sets the owner session when bootstrap succeeds", async () => {
      vi.mocked(api.post).mockResolvedValue({
        ok: true,
        owner: {
          id: "owner",
          email: "owner@example.com",
          name: "ME3 Core Owner",
          username: "owner",
          timezone: "Europe/Dublin",
        },
      });

      const store = useAuthStore();
      const result = await store.bootstrapOwner({
        bootstrapCode: "local-code",
        email: "owner@example.com",
        name: "ME3 Core Owner",
        username: "owner",
      });

      expect(result).toBe(true);
      expect(store.user).toEqual({
        ...storedUser,
        timezone: "Europe/Dublin",
      });
      expect(store.isAuthenticated).toBe(true);
      expect(store.initialized).toBe(true);
      expect(window.localStorage.getItem("me3_core_owner_session")).toContain(
        "owner@example.com",
      );
      expect(api.post).toHaveBeenCalledWith("/admin/bootstrap", {
        bootstrapCode: "local-code",
        email: "owner@example.com",
        name: "ME3 Core Owner",
        username: "owner",
      });
    });

    it("omits a blank email", async () => {
      vi.mocked(api.post).mockResolvedValue({
        ok: true,
        owner: {
          id: "owner",
          email: null,
          name: "ME3 Core Owner",
          username: "owner",
          timezone: "UTC",
        },
      });

      const store = useAuthStore();
      const result = await store.bootstrapOwner({
        bootstrapCode: "local-code",
        email: "   ",
        name: "ME3 Core Owner",
        username: "owner",
      });

      expect(result).toBe(true);
      expect(api.post).toHaveBeenCalledWith("/admin/bootstrap", {
        bootstrapCode: "local-code",
        email: undefined,
        name: "ME3 Core Owner",
        username: "owner",
      });
    });

    it("returns false on invalid bootstrap", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Invalid code"));

      const store = useAuthStore();
      const result = await store.bootstrapOwner({
        bootstrapCode: "bad-code",
        name: "ME3 Core Owner",
        username: "owner",
      });

      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("clears user and local storage", async () => {
      const store = useAuthStore();
      store.setSession(storedUser);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.initialized).toBe(true);
      expect(window.localStorage.getItem("me3_core_owner_session")).toBeNull();
    });
  });
});
