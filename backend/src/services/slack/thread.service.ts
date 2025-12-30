import type { WebClient } from "@slack/web-api";
import type { ThreadMessage } from "../../types/summary.js";
import { env } from "../../config/env.js";
import { logger } from "../../middleware/logger.js";

export class ThreadService {
  private client: WebClient;
  private userCache: Map<string, string> = new Map();

  constructor(client: WebClient) {
    this.client = client;
  }

  async fetchThreadMessages(
    channelId: string,
    threadTs: string
  ): Promise<ThreadMessage[]> {
    logger.debug({ channelId, threadTs }, "Fetching thread messages");

    const result = await this.client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: env.MAX_THREAD_MESSAGES,
    });

    if (!result.messages || result.messages.length === 0) {
      return [];
    }

    const messages: ThreadMessage[] = [];

    for (const msg of result.messages) {
      if (!msg.text || !msg.ts) continue;

      // Skip bot messages if needed
      if (msg.bot_id) continue;

      const userName = msg.user
        ? await this.resolveUserName(msg.user)
        : "Unknown";

      messages.push({
        userId: msg.user || "unknown",
        userName,
        text: msg.text,
        timestamp: msg.ts,
        threadTs: msg.thread_ts,
      });
    }

    logger.info(
      { channelId, threadTs, messageCount: messages.length },
      "Thread messages fetched"
    );

    return messages;
  }

  private async resolveUserName(userId: string): Promise<string> {
    // Check cache first
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    try {
      const result = await this.client.users.info({ user: userId });

      if (result.user) {
        const name =
          result.user.real_name ||
          result.user.name ||
          result.user.profile?.display_name ||
          userId;
        this.userCache.set(userId, name);
        return name;
      }
    } catch (error) {
      logger.warn({ userId, error }, "Failed to resolve user name");
    }

    return userId;
  }

  async checkThreadExists(
    channelId: string,
    messageTs: string
  ): Promise<boolean> {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: messageTs,
        limit: 1,
      });

      return (result.messages?.length || 0) > 1;
    } catch {
      return false;
    }
  }
}
