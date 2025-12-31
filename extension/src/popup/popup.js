// Popup Script

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
};

// Load settings
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      document.getElementById("targetLanguage").value = result.targetLanguage;
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
