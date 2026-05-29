import { vi, describe, it, expect, beforeEach } from "vitest";
import { createMockUserContext } from "./test-helpers";
import { PaperlessProvider } from "./paperless.provider";

describe("paperless.provider", () => {
  let provider: PaperlessProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new PaperlessProvider();
  });

  it("should have correct id, name, category, icon and authMethod", () => {
    expect(provider.id).toBe("paperless");
    expect(provider.name).toBe("Paperless-ngx");
    expect(provider.category).toBe("docs");
    expect(provider.icon).toBe("file-text");
    expect(provider.authMethod).toBe("api-key");
  });

  describe("health", () => {
    it("should return healthy when fetch returns 200", async () => {
      const ctx = createMockUserContext({
        credentials: {
          paperless: {
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
          paperless: {
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

  describe("searchDocs", () => {
    it("should search documents", async () => {
      const mockDocs = { 
        results: [
          { id: 1, title: "Test Document" }
        ]
      };
      const ctx = createMockUserContext({
        credentials: {
          paperless: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockDocs,
        }) as any,
      });

      const result = await provider.query.searchDocs({ query: "test" }, ctx);
      expect(result).toEqual(mockDocs);
    });
  });

  describe("getDoc", () => {
    it("should fetch a document", async () => {
      const mockDoc = { id: 1, title: "Test Document" };
      const ctx = createMockUserContext({
        credentials: {
          paperless: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockDoc,
        }) as any,
      });

      const result = await provider.query.getDoc({ id: 1 }, ctx);
      expect(result).toEqual(mockDoc);
    });
  });

  describe("getTags", () => {
    it("should fetch tags", async () => {
      const mockTags = { 
        results: [
          { id: 1, name: "Test Tag" }
        ]
      };
      const ctx = createMockUserContext({
        credentials: {
          paperless: {
            url: "http://test.com",
            token: "test-token",
          },
        },
        fetch: vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockTags,
        }) as any,
      });

      const result = await provider.query.getTags({}, ctx);
      expect(result).toEqual(mockTags);
    });
  });
});