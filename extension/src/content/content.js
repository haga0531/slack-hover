// Main Content Script Controller for Slack Thread Summarizer

class STMController {
  constructor() {
    this.settings = null;
    this.messageObserver = null;
    this.hoverUI = null;
    this.summaryPopup = null;
  }

  async initialize() {
    // Load settings
    this.settings = await window.StorageManager.getSettings();

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
  }

  onNewMessage(messageElement) {
    this.hoverUI.attachHoverListeners(messageElement);
  }

  async handleSummarizeRequest(messageElement) {
    const metadata = window.SlackDOMParser.extractMessageMetadata(messageElement);

    // Allow both thread messages (threadTs) and single messages (messageTs)
    const targetTs = metadata?.threadTs || metadata?.messageTs;
    if (!metadata || !targetTs) {
      this.showPopupWithError(
        messageElement,
        "Could not identify the message. Please try again."
      );
      return;
    }

    // Show popup with loading state
    const rect = messageElement.getBoundingClientRect();
    this.summaryPopup.show({ x: rect.right, y: rect.top });
    this.summaryPopup.showLoading("Checking cache...");

    try {
      // Get DOM reply count for cache validation
      // Note: DOM reply count = thread replies, API messageCount = total messages (replies + 1)
      const domReplyCount = window.SlackDOMParser.getReplyCount(messageElement);
      // Convert to expected message count (add 1 for the parent message)
      const expectedMessageCount =
        domReplyCount !== null ? domReplyCount + 1 : null;

      // Check cache first (with message count validation if available)
      const cached = await window.StorageManager.getCachedSummary(
        metadata.channelId,
        targetTs,
        expectedMessageCount
      );

      if (cached && cached.language === this.settings.targetLanguage) {
        this.summaryPopup.showSummary(cached.summary);
        return;
      }

      // Update progress
      this.summaryPopup.updateLoadingMessage("Fetching thread...");

      // Show translation progress after a delay
      const translatingTimeout = setTimeout(() => {
        this.summaryPopup.updateLoadingMessage("Translating...");
      }, 1500);

      // Request summary from background script
      const response = await chrome.runtime.sendMessage({
        type: "SUMMARIZE_THREAD",
        payload: {
          channelId: metadata.channelId,
          threadTs: targetTs,
          teamId: metadata.teamId,
          targetLanguage: this.settings.targetLanguage,
        },
      });

      clearTimeout(translatingTimeout);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.status === "error") {
        throw new Error(response.message || "Failed to generate summary");
      }

      // Cache the result with message count for future validation
      await window.StorageManager.cacheSummary(
        metadata.channelId,
        targetTs,
        response.summary,
        this.settings.targetLanguage,
        response.messageCount || null
      );

      this.summaryPopup.showSummary(response.summary);
    } catch (error) {
      this.summaryPopup.showError(error.message || "Failed to generate summary");
    }
  }

  showPopupWithError(messageElement, message) {
    const rect = messageElement.getBoundingClientRect();
    this.summaryPopup.show({ x: rect.right, y: rect.top });
    this.summaryPopup.showError(message);
  }

  onSettingsChange(changes) {
    if (changes.targetLanguage) {
      this.settings.targetLanguage = changes.targetLanguage.newValue;
    }
    if (changes.developerMode) {
      this.settings.developerMode = changes.developerMode.newValue;
    }
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
