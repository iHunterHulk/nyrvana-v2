import { vi, describe, it, expect, beforeEach } from "vitest";
import { createMockUserContext } from "./test-helpers";
import { MinifluxProvider } from "./miniflux.provider";

describe("miniflux.provider", () => {
  let provider: MinifluxProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MinifluxProvider();
  });

  it("should have correct id, name, category, icon and authMethod", () => {
    expect(provider.id).toBe("miniflux");
    expect(provider.name).toBe("Miniflux");
    expect(provider.category).toBe("feeds");
    expect(provider.icon).toBe("rss");
    expect(provider.authMethod).toBe("api-key");
  });

  describe("health", () => {
    it("should return healthy when fetch returns 200", async () => {
      const ctx = createMockUserContext({
        credentials: {
          miniflux: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
        }) as any,
      });

      const result = await provider.health(ctx);
      expect(result).toEqual({ status: "healthy" });
    });

    it("should return down when fetch fails", async () => {
      const ctx = createMockUserContext({
        credentials: {
          miniflux: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockRejectedValueOnce(new Error("Network error")) as any,
      });

      const result = await provider.health(ctx);
      expect(result).toEqual({ status: "down", message: "Network error" });
    });
  });

  describe("getUnread", () => {
    it("should fetch unread entries", async () => {
      const mockEntries = [{ id: 1, title: "Test Entry" }];
      const ctx = createMockUserContext({
        credentials: {
          miniflux: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => ({ entries: mockEntries }),
        }) as any,
      });

      const result = await provider.query.getUnread({}, ctx);
      expect(result).toEqual({ entries: mockEntries });
    });
  });

  describe("getFeeds", () => {
    it("should fetch feeds", async () => {
      const mockFeeds = [{ id: 1, title: "Test Feed" }];
      const ctx = createMockUserContext({
        credentials: {
          miniflux: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockFeeds,
        }) as any,
      });

      const result = await provider.query.getFeeds({}, ctx);
      expect(result).toEqual(mockFeeds);
    });
  });

  describe("markRead", () => {
    it("should mark entries as read", async () => {
      const ctx = createMockUserContext({
        credentials: {
          miniflux: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
        }) as any,
      });

      const result = await provider.mutation.markRead({ entryIds: [1, 2] }, ctx);
      expect(result).toEqual({ success: true, count: 2 });
    });
  });
});