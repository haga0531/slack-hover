// Background Service Worker for Slack Thread Summarizer

const DEFAULT_SETTINGS = {
  targetLanguage: "ja",
  apiEndpoint: "",
  developerMode: false,
};

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SUMMARIZE_THREAD") {
    handleSummarizeRequest(request.payload)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.type === "GET_SETTINGS") {
    getSettings().then(sendResponse);
    return true;
  }

  return false;
});

// Handle summarize request
async function handleSummarizeRequest(payload) {
  const { channelId, threadTs, teamId, targetLanguage } = payload;

  console.log("[STM Service Worker] Summarize request:", payload);

  const settings = await getSettings();

  if (!settings.apiEndpoint) {
    throw new Error("API endpoint not configured. Please set it in extension options.");
  }

  const response = await fetch(`${settings.apiEndpoint}/api/summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel_id: channelId,
      thread_ts: threadTs,
      team_id: teamId,
      target_lang: targetLanguage || settings.targetLanguage,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status === "error") {
    throw new Error(data.message || "Failed to generate summary");
  }

  return data;
}

// Get settings from storage
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve(result);
    });
  });
}

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[STM] Extension installed");
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

console.log("[STM] Service Worker loaded");
