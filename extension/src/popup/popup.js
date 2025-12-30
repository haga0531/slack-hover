// Popup Script

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
  apiEndpoint: "",
  developerMode: false,
};

// Load settings
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      document.getElementById("targetLanguage").value = result.targetLanguage;

      // Update status indicator
      const indicator = document.getElementById("statusIndicator");
      if (result.apiEndpoint) {
        indicator.classList.remove("disconnected");
        indicator.title = "Connected to API";
      } else {
        indicator.classList.add("disconnected");
        indicator.title = "API endpoint not configured";
      }

      resolve();
    });
  });
}

// Save language setting
async function saveLanguage(language) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ targetLanguage: language }, resolve);
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  // Language change handler
  document.getElementById("targetLanguage").addEventListener("change", (e) => {
    saveLanguage(e.target.value);
  });

  // Open options handler
  document.getElementById("openOptions").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
