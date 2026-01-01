import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env module
vi.mock("../../../config/env.js", () => ({
  env: {
    MAX_THREAD_MESSAGES: 100,
  },
}));

// Mock logger
vi.mock("../../../middleware/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { ThreadService, clearGlobalUserCache } from "../../../services/slack/thread.service.js";

describe("ThreadService", () => {
  const mockConversationsReplies = vi.fn();
  const mockUsersInfo = vi.fn();

  const mockClient = {
    conversations: {
      replies: mockConversationsReplies,
    },
    users: {
      info: mockUsersInfo,
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    clearGlobalUserCache(); // Clear global cache between tests
  });

  describe("fetchThreadMessages", () => {
    it("should fetch and return thread messages", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [
          { user: "U123", text: "Hello", ts: "1234567890.123456" },
          { user: "U456", text: "Hi there", ts: "1234567890.123457" },
        ],
      });

      mockUsersInfo
        .mockResolvedValueOnce({ user: { real_name: "Alice" } })
        .mockResolvedValueOnce({ user: { real_name: "Bob" } });

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        userId: "U123",
        userName: "Alice",
        text: "Hello",
        timestamp: "1234567890.123456",
        threadTs: undefined,
      });
      expect(messages[1]).toEqual({
        userId: "U456",
        userName: "Bob",
        text: "Hi there",
        timestamp: "1234567890.123457",
        threadTs: undefined,
      });
    });

    it("should return empty array when no messages", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [],
      });

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages).toEqual([]);
    });

    it("should return empty array when messages is undefined", async () => {
      mockConversationsReplies.mockResolvedValue({});

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages).toEqual([]);
    });

    it("should filter out bot messages", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [
          { user: "U123", text: "Human message", ts: "1234567890.123456" },
          { user: "B456", text: "Bot message", ts: "1234567890.123457", bot_id: "B456" },
        ],
      });

      mockUsersInfo.mockResolvedValue({ user: { real_name: "Alice" } });

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Human message");
    });

    it("should filter out messages without text", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [
          { user: "U123", text: "Has text", ts: "1234567890.123456" },
          { user: "U456", ts: "1234567890.123457" }, // No text
        ],
      });

      mockUsersInfo.mockResolvedValue({ user: { real_name: "Alice" } });

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe("Has text");
    });

    it("should cache user names", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [
          { user: "U123", text: "First", ts: "1234567890.123456" },
          { user: "U123", text: "Second", ts: "1234567890.123457" },
        ],
      });

      mockUsersInfo.mockResolvedValue({ user: { real_name: "Alice" } });

      const service = new ThreadService(mockClient);
      await service.fetchThreadMessages("C123", "1234567890.000000");

      // User info should only be called once for U123
      expect(mockUsersInfo).toHaveBeenCalledTimes(1);
    });

    it("should use userId when user resolution fails", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [{ user: "U123", text: "Hello", ts: "1234567890.123456" }],
      });

      mockUsersInfo.mockRejectedValue(new Error("User not found"));

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages[0].userName).toBe("U123");
    });

    it("should use fallback names in order: real_name, name, display_name, userId", async () => {
      mockConversationsReplies.mockResolvedValue({
        messages: [{ user: "U123", text: "Hello", ts: "1234567890.123456" }],
      });

      // Test with only display_name available
      mockUsersInfo.mockResolvedValue({
        user: { profile: { display_name: "DisplayName" } },
      });

      const service = new ThreadService(mockClient);
      const messages = await service.fetchThreadMessages("C123", "1234567890.000000");

      expect(messages[0].userName).toBe("DisplayName");
    });
  });

});
