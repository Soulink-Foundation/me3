import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useContentStore } from "./content";
import { api } from "../api";

vi.mock("../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
  ApiError: class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

describe("content store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("fetchItems passes siteId and status", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ items: [] });
    const store = useContentStore();
    await store.fetchItems("site1", "bank");
    expect(api.get).toHaveBeenCalledWith("/content/items?siteId=site1&status=bank");
  });

  it("createItem posts payload", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      item: { id: "content1", platforms: ["x"] },
    });
    const store = useContentStore();
    const item = await store.createItem({
      siteId: "site1",
      body: "Hello",
      platforms: ["x"],
    });
    expect(item.id).toBe("content1");
    expect(api.post).toHaveBeenCalledWith("/content/items", {
      siteId: "site1",
      body: "Hello",
      platforms: ["x"],
    });
  });

  it("publishItem posts to publish endpoint", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ item: { id: "content1" } });
    const store = useContentStore();
    await store.publishItem("content1");
    expect(api.post).toHaveBeenCalledWith("/content/items/content1/publish", {});
  });

  it("queueItem posts to queue endpoint", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ item: { id: "content1" } });
    const store = useContentStore();
    await store.queueItem("content1");
    expect(api.post).toHaveBeenCalledWith("/content/items/content1/queue", {});
  });

  it("unqueueItem posts to unqueue endpoint", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ item: { id: "content1" } });
    const store = useContentStore();
    await store.unqueueItem("content1");
    expect(api.post).toHaveBeenCalledWith("/content/items/content1/unqueue", {});
  });

  it("reorderQueue sends the full queue order", async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ items: [{ id: "content1" }] });
    const store = useContentStore();
    await store.reorderQueue("site1", ["content1", "content2"]);
    expect(api.put).toHaveBeenCalledWith("/content/queue/reorder", {
      siteId: "site1",
      itemIds: ["content1", "content2"],
    });
  });
});
