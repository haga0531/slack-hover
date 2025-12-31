// Storage Manager for Chrome Extension
// Uses globalThis to preserve chrome API access in content script context

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
  apiEndpoint: "https://stm-backend-sxbj32ez6q-an.a.run.app",
};

// Store chrome reference at load time (content script context)
const chromeAPI = typeof chrome !== "undefined" ? chrome : null;

// Local cache TTL: 30 days
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const StorageManager = {
  async getSettings() {
    if (!chromeAPI?.storage?.sync) {
      console.warn("[STM] chrome.storage.sync not available");
      return { ...DEFAULT_SETTINGS };
    }
    return new Promise((resolve) => {
      chromeAPI.storage.sync.get(DEFAULT_SETTINGS, (result) => {
        resolve(result);
      });
    });
  },

  async saveSettings(settings) {
    if (!chromeAPI?.storage?.sync) {
      console.warn("[STM] chrome.storage.sync not available");
      return;
    }
    return new Promise((resolve) => {
      chromeAPI.storage.sync.set(settings, () => {
        resolve();
      });
    });
  },

  async getSetting(key) {
    const settings = await this.getSettings();
    return settings[key];
  },

  async getCachedSummary(channelId, threadTs, expectedMessageCount = null) {
    if (!chromeAPI?.storage?.local) {
      console.warn("[STM] chrome.storage.local not available");
      return null;
    }
    const key = `${channelId}-${threadTs}`;
    return new Promise((resolve) => {
      chromeAPI.storage.local.get(["summaryCache"], (result) => {
        const cache = result.summaryCache || {};
        const entry = cache[key];

        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL expiration
        if (entry.timestamp && Date.now() - entry.timestamp > CACHE_TTL_MS) {
          resolve(null);
          return;
        }

        // If expectedMessageCount is provided, validate cache
        if (
          expectedMessageCount !== null &&
          entry.messageCount !== undefined &&
          entry.messageCount !== expectedMessageCount
        ) {
          resolve(null);
          return;
        }

        resolve(entry);
      });
    });
  },

  async cacheSummary(channelId, threadTs, summary, language, messageCount = null) {
    if (!chromeAPI?.storage?.local) {
      console.warn("[STM] chrome.storage.local not available");
      return;
    }
    const key = `${channelId}-${threadTs}`;

    return new Promise((resolve) => {
      chromeAPI.storage.local.get(["summaryCache"], (result) => {
        const cache = result.summaryCache || {};

        cache[key] = {
          summary,
          language,
          messageCount,
          timestamp: Date.now(),
        };

        // Limit cache size to 100 entries
        const keys = Object.keys(cache);
        if (keys.length > 100) {
          const sortedKeys = keys.sort(
            (a, b) => cache[a].timestamp - cache[b].timestamp
          );
          sortedKeys.slice(0, keys.length - 100).forEach((k) => delete cache[k]);
        }

        chromeAPI.storage.local.set({ summaryCache: cache }, () => {
          resolve();
        });
      });
    });
  },

  onSettingsChange(callback) {
    if (!chromeAPI?.storage?.onChanged) {
      console.warn("[STM] chrome.storage.onChanged not available");
      return;
    }
    chromeAPI.storage.onChanged.addListener((changes, area) => {
      if (area === "sync") {
        callback(changes);
      }
    });
  },
};

// Make available globally
window.StorageManager = StorageManager;
