// Options Page Script

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
};

// Load settings on page load
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      document.getElementById("targetLanguage").value = result.targetLanguage;
      resolve();
    });
  });
}

// Save settings
async function saveSettings() {
  const settings = {
    targetLanguage: document.getElementById("targetLanguage").value,
  };

  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      showStatus("Settings saved successfully!", "success");
      resolve();
    });
  });
}

// Show status message
function showStatus(message, type) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.className = `status ${type}`;

  // Hide after 3 seconds
  setTimeout(() => {
    status.className = "status";
  }, 3000);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  document.getElementById("saveButton").addEventListener("click", saveSettings);
});
