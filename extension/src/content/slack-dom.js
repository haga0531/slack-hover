// Slack DOM Parser and Observer

const SELECTORS = {
  MESSAGE_CONTAINER: '.c-virtual_list__item[data-item-key]',
  MESSAGE_TEXT: '[data-qa="message-text"]',
  SCROLL_CONTAINER: '.c-virtual_list__scroll_container',
  WORKSPACE_VIEW: '.p-workspace__primary_view_contents',
  MESSAGE_ACTIONS: '.c-message__actions',
};

const SlackDOMParser = {
  // Parse Slack URL to extract team_id, channel_id, and thread_ts
  parseSlackUrl() {
    const url = window.location.href;

    // Pattern 1: Thread view
    // https://app.slack.com/client/T123/C456/thread/C456-1234567890.123456
    const threadPattern = /\/client\/([^\/]+)\/([^\/]+)\/thread\/([^-]+)-(.+)/;

    // Pattern 2: Channel view
    // https://app.slack.com/client/T123/C456
    const channelPattern = /\/client\/([^\/]+)\/([^\/]+)/;

    let match = url.match(threadPattern);
    if (match) {
      return {
        teamId: match[1],
        channelId: match[2],
        threadChannelId: match[3],
        threadTs: match[4],
      };
    }

    match = url.match(channelPattern);
    if (match) {
      return {
        teamId: match[1],
        channelId: match[2],
        threadTs: null,
      };
    }

    return null;
  },

  // Extract message metadata from DOM element
  extractMessageMetadata(messageElement) {
    const urlData = this.parseSlackUrl();

    if (!urlData) {
      return null;
    }

    // Try to get thread_ts from data-item-key
    const itemKey = messageElement.getAttribute("data-item-key");

    // The item key format varies, try to extract timestamp
    let messageTs = null;
    if (itemKey) {
      // itemKey might be in format like "1234567890.123456" or include prefix
      const tsMatch = itemKey.match(/(\d+\.\d+)/);
      if (tsMatch) {
        messageTs = tsMatch[1];
      }
    }

    return {
      teamId: urlData.teamId,
      channelId: urlData.channelId,
      threadTs: urlData.threadTs || messageTs,
      messageTs: messageTs,
    };
  },

  // Get all message elements
  getAllMessages() {
    return document.querySelectorAll(SELECTORS.MESSAGE_CONTAINER);
  },

  // Get thread reply count from DOM (returns null if not visible or not a thread)
  getReplyCount(messageElement) {
    const threadIndicator = messageElement.querySelector(
      '[data-qa="message_thread_reply_count"]'
    );
    if (!threadIndicator) {
      return null;
    }

    // Try to extract number from text like "5 replies" or "3件の返信"
    const text = threadIndicator.textContent || "";
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  },
};

// Message Observer using MutationObserver
class SlackMessageObserver {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.observer = null;
    this.processedMessages = new WeakSet();
  }

  start() {
    this.waitForContainer().then((container) => {
      this.observer = new MutationObserver((mutations) => {
        this.handleMutations(mutations);
      });

      this.observer.observe(container, {
        childList: true,
        subtree: true,
      });

      // Process existing messages
      this.processExistingMessages();
    });
  }

  async waitForContainer() {
    return new Promise((resolve) => {
      const check = () => {
        const container = document.querySelector(SELECTORS.SCROLL_CONTAINER);
        if (container) {
          resolve(container);
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  handleMutations(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.processNode(node);
        }
      }
    }
  }

  processNode(node) {
    // Check if this node is a message container
    if (node.matches && node.matches(SELECTORS.MESSAGE_CONTAINER)) {
      this.processMessage(node);
    }

    // Check child elements
    const messages = node.querySelectorAll
      ? node.querySelectorAll(SELECTORS.MESSAGE_CONTAINER)
      : [];
    messages.forEach((msg) => this.processMessage(msg));
  }

  processMessage(messageElement) {
    if (this.processedMessages.has(messageElement)) return;
    this.processedMessages.add(messageElement);

    if (this.callbacks.onNewMessage) {
      this.callbacks.onNewMessage(messageElement);
    }
  }

  processExistingMessages() {
    const messages = SlackDOMParser.getAllMessages();
    messages.forEach((msg) => this.processMessage(msg));
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Make available globally
window.SlackDOMParser = SlackDOMParser;
window.SlackMessageObserver = SlackMessageObserver;
