// Options Page Script

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
  apiEndpoint: "",
  developerMode: false,
};

// Load settings on page load
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      document.getElementById("targetLanguage").value = result.targetLanguage;
      document.getElementById("apiEndpoint").value = result.apiEndpoint;
      document.getElementById("developerMode").checked = result.developerMode;
      resolve();
    });
  });
}

// Save settings
async function saveSettings() {
  const settings = {
    targetLanguage: document.getElementById("targetLanguage").value,
    apiEndpoint: document.getElementById("apiEndpoint").value.trim(),
    developerMode: document.getElementById("developerMode").checked,
  };

  // Validate API endpoint
  if (settings.apiEndpoint && !isValidUrl(settings.apiEndpoint)) {
    showStatus("Please enter a valid URL for the API endpoint", "error");
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      showStatus("Settings saved successfully!", "success");
      resolve();
    });
  });
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
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
