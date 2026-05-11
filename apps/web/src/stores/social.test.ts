import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSocialStore } from "./social";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

describe("social store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("fetchSocialAccounts maps response", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      accounts: [
        {
          id: "1",
          siteId: "s",
          platform: "x",
          handle: "h",
          displayName: "N",
          status: "active",
          lastVerifiedAt: null,
        },
      ],
    });
    const store = useSocialStore();
    const rows = await store.fetchSocialAccounts();
    expect(rows).toHaveLength(1);
    expect(rows[0].platform).toBe("x");
  });
});
