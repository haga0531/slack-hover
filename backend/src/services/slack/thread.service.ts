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
    const result = await this.client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: env.MAX_THREAD_MESSAGES,
    });

    if (!result.messages || result.messages.length === 0) {
      return [];
    }

    // Filter valid messages first
    const validMessages = result.messages.filter(
      (msg) => msg.text && msg.ts && !msg.bot_id
    );

    // Collect unique user IDs for parallel resolution
    const uniqueUserIds = [
      ...new Set(validMessages.map((msg) => msg.user).filter(Boolean)),
    ] as string[];

    // Resolve all user names in parallel
    await Promise.all(
      uniqueUserIds.map((userId) => this.resolveUserName(userId))
    );

    // Build messages using cached user names
    const messages: ThreadMessage[] = validMessages.map((msg) => ({
      userId: msg.user || "unknown",
      userName: msg.user ? this.userCache.get(msg.user) || msg.user : "Unknown",
      text: this.cleanSlackText(msg.text!),
      timestamp: msg.ts!,
      threadTs: msg.thread_ts,
    }));

    return messages;
  }

  /**
   * Clean Slack message text by converting link format to display text only
   * <URL|display_text> → display_text
   * <URL> → (removed)
   */
  private cleanSlackText(text: string): string {
    // Replace <URL|display_text> with display_text
    let cleaned = text.replace(/<([^|>]+)\|([^>]+)>/g, "$2");

    // Remove <URL> (links without display text)
    cleaned = cleaned.replace(/<(https?:\/\/[^>]+)>/g, "");

    return cleaned.trim();
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

}
