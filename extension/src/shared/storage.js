// Storage Manager for Chrome Extension

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
  apiEndpoint: "",
  developerMode: false,
};

const StorageManager = {
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
        resolve(result);
      });
    });
  },

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        resolve();
      });
    });
  },

  async getSetting(key) {
    const settings = await this.getSettings();
    return settings[key];
  },

  async getCachedSummary(channelId, threadTs) {
    const key = `${channelId}-${threadTs}`;
    return new Promise((resolve) => {
      chrome.storage.local.get(["summaryCache"], (result) => {
        const cache = result.summaryCache || {};
        resolve(cache[key] || null);
      });
    });
  },

  async cacheSummary(channelId, threadTs, summary, language) {
    const key = `${channelId}-${threadTs}`;

    return new Promise((resolve) => {
      chrome.storage.local.get(["summaryCache"], (result) => {
        const cache = result.summaryCache || {};

        cache[key] = {
          summary,
          language,
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

        chrome.storage.local.set({ summaryCache: cache }, () => {
          resolve();
        });
      });
    });
  },

  onSettingsChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync") {
        callback(changes);
      }
    });
  },
};

// Make available globally
window.StorageManager = StorageManager;
