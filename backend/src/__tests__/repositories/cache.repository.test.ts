import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Firestore
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockDoc = vi.fn(() => ({
  get: mockGet,
  set: mockSet,
  delete: mockDelete,
  ref: { delete: mockDelete },
}));
const mockCollection = vi.fn(() => ({
  doc: mockDoc,
}));

vi.mock("@google-cloud/firestore", () => ({
  Firestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  Timestamp: {
    now: vi.fn(() => ({
      toMillis: () => Date.now(),
    })),
    fromMillis: vi.fn((ms: number) => ({
      toMillis: () => ms,
    })),
  },
}));

vi.mock("../../config/env.js", () => ({
  env: {
    GCP_PROJECT_ID: "test-project",
  },
}));

vi.mock("../../middleware/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CacheRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cache key validation", () => {
    it("should validate Slack team ID format", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      // Invalid team ID should throw
      mockGet.mockResolvedValue({ exists: false });

      // Valid format: T followed by alphanumeric
      await CacheRepository.get(
        "T12345678",
        "C12345678",
        "1234567890.123456",
        "ja"
      );

      expect(mockCollection).toHaveBeenCalledWith("summary_cache");
      expect(mockDoc).toHaveBeenCalledWith("T12345678:C12345678:1234567890.123456:ja");
    });

    it("should reject invalid team ID format", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      // Invalid format - should return null (error caught)
      const result = await CacheRepository.get(
        "invalid",
        "C12345678",
        "1234567890.123456",
        "ja"
      );

      expect(result).toBeNull();
    });

    it("should reject invalid timestamp format", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      const result = await CacheRepository.get(
        "T12345678",
        "C12345678",
        "invalid-timestamp",
        "ja"
      );

      expect(result).toBeNull();
    });
  });

  describe("get", () => {
    it("should return null for cache miss", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      mockGet.mockResolvedValue({ exists: false });

      const result = await CacheRepository.get(
        "T12345678",
        "C12345678",
        "1234567890.123456",
        "ja"
      );

      expect(result).toBeNull();
    });

    it("should return cached entry for cache hit", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      const cachedSummary = {
        title: "Test",
        overview: "Test overview",
        decisions: [],
        todos: [],
        blockers: [],
        techNotes: [],
        language: "ja",
      };

      const futureExpiry = Date.now() + 1000 * 60 * 60 * 24; // 24 hours from now

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          summary: cachedSummary,
          messageCount: 5,
          createdAt: { toMillis: () => Date.now() - 1000 },
          expiresAt: { toMillis: () => futureExpiry },
        }),
      });

      const result = await CacheRepository.get(
        "T12345678",
        "C12345678",
        "1234567890.123456",
        "ja"
      );

      expect(result).not.toBeNull();
      expect(result?.summary).toEqual(cachedSummary);
      expect(result?.messageCount).toBe(5);
    });

    it("should return null for expired cache", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      const pastExpiry = Date.now() - 1000; // Already expired

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          summary: {},
          messageCount: 5,
          createdAt: { toMillis: () => Date.now() - 1000 },
          expiresAt: { toMillis: () => pastExpiry },
        }),
        ref: { delete: mockDelete },
      });

      const result = await CacheRepository.get(
        "T12345678",
        "C12345678",
        "1234567890.123456",
        "ja"
      );

      expect(result).toBeNull();
    });

    it("should return null when message count differs", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      const futureExpiry = Date.now() + 1000 * 60 * 60 * 24;

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          summary: {},
          messageCount: 5,
          createdAt: { toMillis: () => Date.now() - 1000 },
          expiresAt: { toMillis: () => futureExpiry },
        }),
      });

      // Expected 10 messages but cache has 5
      const result = await CacheRepository.get(
        "T12345678",
        "C12345678",
        "1234567890.123456",
        "ja",
        10
      );

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should store summary in cache", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      mockSet.mockResolvedValue(undefined);

      const summary = {
        title: "Test",
        overview: "Test overview",
        decisions: [],
        todos: [],
        blockers: [],
        techNotes: [],
        language: "ja" as const,
      };

      await CacheRepository.set(
        "T12345678",
        "C12345678",
        "1234567890.123456",
        "ja",
        summary,
        5
      );

      expect(mockSet).toHaveBeenCalled();
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.summary).toEqual(summary);
      expect(setCall.messageCount).toBe(5);
      expect(setCall.createdAt).toBeDefined();
      expect(setCall.expiresAt).toBeDefined();
    });
  });

  describe("workspace isolation", () => {
    it("should use team_id in cache key for workspace isolation", async () => {
      const { CacheRepository } = await import("../../repositories/cache.repository.js");

      mockGet.mockResolvedValue({ exists: false });

      // Same channel and thread, different teams
      await CacheRepository.get("T11111111", "C12345678", "1234567890.123456", "ja");
      await CacheRepository.get("T22222222", "C12345678", "1234567890.123456", "ja");

      expect(mockDoc).toHaveBeenCalledWith("T11111111:C12345678:1234567890.123456:ja");
      expect(mockDoc).toHaveBeenCalledWith("T22222222:C12345678:1234567890.123456:ja");
    });
  });
});
