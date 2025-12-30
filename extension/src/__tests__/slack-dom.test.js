import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to test the module's functions
// The module attaches to window, so we'll load it and test window.SlackDOMParser

describe("SlackDOMParser", () => {
  let SlackDOMParser;

  beforeEach(async () => {
    // Reset window location
    delete window.location;
    window.location = { href: "https://app.slack.com/client/T123/C456" };

    // Load the module fresh
    vi.resetModules();
    await import("../content/slack-dom.js");
    SlackDOMParser = window.SlackDOMParser;
  });

  describe("parseSlackUrl", () => {
    it("should parse channel view URL", () => {
      window.location.href = "https://app.slack.com/client/T123ABC/C456DEF";

      const result = SlackDOMParser.parseSlackUrl();

      expect(result).toEqual({
        teamId: "T123ABC",
        channelId: "C456DEF",
        threadTs: null,
      });
    });

    it("should parse thread view URL", () => {
      window.location.href =
        "https://app.slack.com/client/T123ABC/C456DEF/thread/C456DEF-1234567890.123456";

      const result = SlackDOMParser.parseSlackUrl();

      expect(result).toEqual({
        teamId: "T123ABC",
        channelId: "C456DEF",
        threadChannelId: "C456DEF",
        threadTs: "1234567890.123456",
      });
    });

    it("should return null for non-Slack URL", () => {
      window.location.href = "https://example.com/";

      const result = SlackDOMParser.parseSlackUrl();

      expect(result).toBeNull();
    });

    it("should handle DM channel IDs", () => {
      window.location.href = "https://app.slack.com/client/T123/D456789";

      const result = SlackDOMParser.parseSlackUrl();

      expect(result).toEqual({
        teamId: "T123",
        channelId: "D456789",
        threadTs: null,
      });
    });
  });

  describe("extractMessageMetadata", () => {
    it("should extract metadata from message element in channel view", () => {
      window.location.href = "https://app.slack.com/client/T123/C456";

      const mockElement = document.createElement("div");
      mockElement.setAttribute("data-item-key", "1234567890.123456");

      const result = SlackDOMParser.extractMessageMetadata(mockElement);

      expect(result).toEqual({
        teamId: "T123",
        channelId: "C456",
        threadTs: "1234567890.123456",
        messageTs: "1234567890.123456",
      });
    });

    it("should extract metadata from message element in thread view", () => {
      window.location.href =
        "https://app.slack.com/client/T123/C456/thread/C456-1111111111.111111";

      const mockElement = document.createElement("div");
      mockElement.setAttribute("data-item-key", "2222222222.222222");

      const result = SlackDOMParser.extractMessageMetadata(mockElement);

      expect(result).toEqual({
        teamId: "T123",
        channelId: "C456",
        threadTs: "1111111111.111111",
        messageTs: "2222222222.222222",
      });
    });

    it("should return null when URL is not Slack", () => {
      window.location.href = "https://example.com/";

      const mockElement = document.createElement("div");

      const result = SlackDOMParser.extractMessageMetadata(mockElement);

      expect(result).toBeNull();
    });

    it("should handle element without data-item-key", () => {
      window.location.href = "https://app.slack.com/client/T123/C456";

      const mockElement = document.createElement("div");

      const result = SlackDOMParser.extractMessageMetadata(mockElement);

      expect(result).toEqual({
        teamId: "T123",
        channelId: "C456",
        threadTs: null,
        messageTs: null,
      });
    });

    it("should extract timestamp from complex data-item-key", () => {
      window.location.href = "https://app.slack.com/client/T123/C456";

      const mockElement = document.createElement("div");
      mockElement.setAttribute("data-item-key", "prefix-1234567890.123456-suffix");

      const result = SlackDOMParser.extractMessageMetadata(mockElement);

      expect(result.messageTs).toBe("1234567890.123456");
    });
  });

  describe("hasThreadReplies", () => {
    it("should return true when thread reply indicator exists", () => {
      const mockElement = document.createElement("div");
      const indicator = document.createElement("span");
      indicator.setAttribute("data-qa", "message_thread_reply_count");
      mockElement.appendChild(indicator);

      const result = SlackDOMParser.hasThreadReplies(mockElement);

      expect(result).toBe(true);
    });

    it("should return false when no thread reply indicator", () => {
      const mockElement = document.createElement("div");

      const result = SlackDOMParser.hasThreadReplies(mockElement);

      expect(result).toBe(false);
    });
  });

  describe("getReplyCount", () => {
    it("should extract reply count from indicator text", () => {
      const mockElement = document.createElement("div");
      const indicator = document.createElement("span");
      indicator.setAttribute("data-qa", "message_thread_reply_count");
      indicator.textContent = "5 replies";
      mockElement.appendChild(indicator);

      const result = SlackDOMParser.getReplyCount(mockElement);

      expect(result).toBe(5);
    });

    it("should extract reply count from Japanese text", () => {
      const mockElement = document.createElement("div");
      const indicator = document.createElement("span");
      indicator.setAttribute("data-qa", "message_thread_reply_count");
      indicator.textContent = "3件の返信";
      mockElement.appendChild(indicator);

      const result = SlackDOMParser.getReplyCount(mockElement);

      expect(result).toBe(3);
    });

    it("should return null when no indicator exists", () => {
      const mockElement = document.createElement("div");

      const result = SlackDOMParser.getReplyCount(mockElement);

      expect(result).toBeNull();
    });

    it("should return null when indicator has no number", () => {
      const mockElement = document.createElement("div");
      const indicator = document.createElement("span");
      indicator.setAttribute("data-qa", "message_thread_reply_count");
      indicator.textContent = "replies";
      mockElement.appendChild(indicator);

      const result = SlackDOMParser.getReplyCount(mockElement);

      expect(result).toBeNull();
    });
  });

  describe("getAllMessages", () => {
    it("should return all message containers", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <div class="c-virtual_list__item" data-item-key="1">Message 1</div>
        <div class="c-virtual_list__item" data-item-key="2">Message 2</div>
        <div class="other-element">Not a message</div>
      `;
      document.body.appendChild(container);

      const messages = SlackDOMParser.getAllMessages();

      expect(messages.length).toBe(2);

      document.body.removeChild(container);
    });
  });
});

describe("SlackMessageObserver", () => {
  let SlackMessageObserver;

  beforeEach(async () => {
    vi.resetModules();
    await import("../content/slack-dom.js");
    SlackMessageObserver = window.SlackMessageObserver;
  });

  it("should be defined on window", () => {
    expect(SlackMessageObserver).toBeDefined();
  });

  it("should accept callbacks in constructor", () => {
    const callbacks = {
      onNewMessage: vi.fn(),
    };

    const observer = new SlackMessageObserver(callbacks);

    expect(observer).toBeDefined();
  });
});
