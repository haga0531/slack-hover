import { describe, it, expect, beforeEach, vi } from "vitest";

describe("StorageManager", () => {
  let StorageManager;

  beforeEach(async () => {
    vi.resetModules();

    // Reset chrome mock
    global.chrome.storage.sync.get.mockImplementation((defaults, callback) => {
      if (callback) callback(defaults);
      return Promise.resolve(defaults);
    });
    global.chrome.storage.sync.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });
    global.chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    });
    global.chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
      return Promise.resolve();
    });

    await import("../shared/storage.js");
    StorageManager = window.StorageManager;
  });

  describe("getSettings", () => {
    it("should return default settings", async () => {
      const settings = await StorageManager.getSettings();

      expect(settings).toEqual({
        targetLanguage: "ja",
        apiEndpoint: "https://stm-backend-sxbj32ez6q-an.a.run.app",
      });
    });

    it("should call chrome.storage.sync.get", async () => {
      await StorageManager.getSettings();

      expect(global.chrome.storage.sync.get).toHaveBeenCalled();
    });

    it("should return defaults when chrome.storage is not available", async () => {
      const originalSync = global.chrome.storage.sync;
      global.chrome.storage.sync = null;

      vi.resetModules();
      await import("../shared/storage.js");
      StorageManager = window.StorageManager;

      const settings = await StorageManager.getSettings();

      expect(settings).toEqual({
        targetLanguage: "ja",
        apiEndpoint: "https://stm-backend-sxbj32ez6q-an.a.run.app",
      });

      global.chrome.storage.sync = originalSync;
    });
  });

  describe("saveSettings", () => {
    it("should call chrome.storage.sync.set", async () => {
      await StorageManager.saveSettings({ targetLanguage: "en" });

      expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
        { targetLanguage: "en" },
        expect.any(Function)
      );
    });
  });

  describe("getSetting", () => {
    it("should return specific setting value", async () => {
      const value = await StorageManager.getSetting("targetLanguage");

      expect(value).toBe("ja");
    });
  });

  describe("getCachedSummary", () => {
    it("should return cached summary if exists", async () => {
      const cachedData = {
        summaryCache: {
          "C123-1234567890.123456": {
            summary: { overview: "Cached summary" },
            language: "ja",
            messageCount: 5,
            timestamp: Date.now(),
          },
        },
      };

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(cachedData);
      });

      const result = await StorageManager.getCachedSummary(
        "C123",
        "1234567890.123456"
      );

      expect(result).toEqual(cachedData.summaryCache["C123-1234567890.123456"]);
    });

    it("should return null if cache does not exist", async () => {
      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const result = await StorageManager.getCachedSummary(
        "C123",
        "1234567890.123456"
      );

      expect(result).toBeNull();
    });

    it("should invalidate cache when message count differs", async () => {
      const cachedData = {
        summaryCache: {
          "C123-1234567890.123456": {
            summary: { overview: "Cached summary" },
            language: "ja",
            messageCount: 5,
            timestamp: Date.now(),
          },
        },
      };

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(cachedData);
      });

      // Expected message count is 10, but cached is 5
      const result = await StorageManager.getCachedSummary(
        "C123",
        "1234567890.123456",
        10
      );

      expect(result).toBeNull();
    });

    it("should return cache when message count matches", async () => {
      const cachedData = {
        summaryCache: {
          "C123-1234567890.123456": {
            summary: { overview: "Cached summary" },
            language: "ja",
            messageCount: 5,
            timestamp: Date.now(),
          },
        },
      };

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(cachedData);
      });

      const result = await StorageManager.getCachedSummary(
        "C123",
        "1234567890.123456",
        5
      );

      expect(result).not.toBeNull();
      expect(result.summary.overview).toBe("Cached summary");
    });

    it("should return cache when expectedMessageCount is null", async () => {
      const cachedData = {
        summaryCache: {
          "C123-1234567890.123456": {
            summary: { overview: "Cached summary" },
            language: "ja",
            messageCount: 5,
            timestamp: Date.now(),
          },
        },
      };

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(cachedData);
      });

      const result = await StorageManager.getCachedSummary(
        "C123",
        "1234567890.123456",
        null
      );

      expect(result).not.toBeNull();
    });
  });

  describe("cacheSummary", () => {
    it("should store summary in cache", async () => {
      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ summaryCache: {} });
      });

      let savedData = null;
      global.chrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        callback();
      });

      await StorageManager.cacheSummary(
        "C123",
        "1234567890.123456",
        { overview: "New summary" },
        "en",
        10
      );

      expect(savedData.summaryCache["C123-1234567890.123456"]).toBeDefined();
      expect(
        savedData.summaryCache["C123-1234567890.123456"].summary.overview
      ).toBe("New summary");
      expect(savedData.summaryCache["C123-1234567890.123456"].language).toBe(
        "en"
      );
      expect(savedData.summaryCache["C123-1234567890.123456"].messageCount).toBe(
        10
      );
    });

    it("should limit cache to 100 entries", async () => {
      // Create cache with 100 entries
      const existingCache = {};
      for (let i = 0; i < 100; i++) {
        existingCache[`C${i}-123456.${i}`] = {
          summary: { overview: `Summary ${i}` },
          language: "ja",
          timestamp: i, // Older entries have lower timestamps
        };
      }

      global.chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ summaryCache: existingCache });
      });

      let savedData = null;
      global.chrome.storage.local.set.mockImplementation((data, callback) => {
        savedData = data;
        callback();
      });

      await StorageManager.cacheSummary(
        "CNEW",
        "999999.999999",
        { overview: "New entry" },
        "en"
      );

      // Should have 100 entries (oldest removed)
      const cacheKeys = Object.keys(savedData.summaryCache);
      expect(cacheKeys.length).toBeLessThanOrEqual(100);
      expect(savedData.summaryCache["CNEW-999999.999999"]).toBeDefined();
    });
  });

  describe("onSettingsChange", () => {
    it("should register change listener", () => {
      const callback = vi.fn();
      StorageManager.onSettingsChange(callback);

      expect(global.chrome.storage.onChanged.addListener).toHaveBeenCalled();
    });
  });
});
