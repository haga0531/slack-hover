// Main Content Script Controller for Slack Thread Summarizer

class STMController {
  constructor() {
    this.settings = null;
    this.messageObserver = null;
    this.hoverUI = null;
    this.summaryPopup = null;
    this.lastRequest = null;
  }

  async initialize() {
    console.log("[STM] Initializing Slack Thread Summarizer...");

    // Load settings
    this.settings = await window.StorageManager.getSettings();
    console.log("[STM] Settings loaded:", this.settings);

    // Initialize UI managers
    this.hoverUI = new window.HoverUIManager({
      onSummarizeRequest: (element) => this.handleSummarizeRequest(element),
    });
    this.summaryPopup = new window.SummaryPopup();

    // Start message observer
    this.messageObserver = new window.SlackMessageObserver({
      onNewMessage: (element) => this.onNewMessage(element),
    });
    this.messageObserver.start();

    // Listen for settings changes
    window.StorageManager.onSettingsChange((changes) => {
      this.onSettingsChange(changes);
    });

    console.log("[STM] Initialization complete");
  }

  onNewMessage(messageElement) {
    this.hoverUI.attachHoverListeners(messageElement);
  }

  async handleSummarizeRequest(messageElement) {
    const metadata = window.SlackDOMParser.extractMessageMetadata(messageElement);

    console.log("[STM] Summarize request:", metadata);

    if (!metadata || !metadata.threadTs) {
      this.showPopupWithError(
        messageElement,
        "Could not identify the thread. Please try from within a thread view."
      );
      return;
    }

    // Store for retry
    this.lastRequest = { messageElement, metadata };

    // Show popup with loading state
    const rect = messageElement.getBoundingClientRect();
    this.summaryPopup.show({ x: rect.right, y: rect.top });

    try {
      // Check cache first
      const cached = await window.StorageManager.getCachedSummary(
        metadata.channelId,
        metadata.threadTs
      );

      if (cached && cached.language === this.settings.targetLanguage) {
        console.log("[STM] Using cached summary");
        this.summaryPopup.showSummary(cached.summary);
        return;
      }

      // Request summary from background script
      const response = await chrome.runtime.sendMessage({
        type: "SUMMARIZE_THREAD",
        payload: {
          channelId: metadata.channelId,
          threadTs: metadata.threadTs,
          teamId: metadata.teamId,
          targetLanguage: this.settings.targetLanguage,
        },
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.status === "error") {
        throw new Error(response.message || "Failed to generate summary");
      }

      // Cache the result
      await window.StorageManager.cacheSummary(
        metadata.channelId,
        metadata.threadTs,
        response.summary,
        this.settings.targetLanguage
      );

      this.summaryPopup.showSummary(response.summary);
    } catch (error) {
      console.error("[STM] Error:", error);
      this.summaryPopup.showError(error.message || "Failed to generate summary");
    }
  }

  showPopupWithError(messageElement, message) {
    const rect = messageElement.getBoundingClientRect();
    this.summaryPopup.show({ x: rect.right, y: rect.top });
    this.summaryPopup.showError(message);
  }

  async retryLastRequest() {
    if (this.lastRequest) {
      await this.handleSummarizeRequest(this.lastRequest.messageElement);
    }
  }

  onSettingsChange(changes) {
    if (changes.targetLanguage) {
      this.settings.targetLanguage = changes.targetLanguage.newValue;
    }
    if (changes.developerMode) {
      this.settings.developerMode = changes.developerMode.newValue;
    }
    console.log("[STM] Settings updated:", this.settings);
  }
}

// Initialize when DOM is ready
const controller = new STMController();
window.STMController = controller;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => controller.initialize());
} else {
  controller.initialize();
}
