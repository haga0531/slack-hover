import type { WebClient } from "@slack/web-api";
import type { ThreadMessage } from "../../types/summary.js";
import { env } from "../../config/env.js";
import { logger } from "../../middleware/logger.js";

interface CachedUserName {
  name: string;
  expiresAt: number;
}

// Global cache shared across requests to avoid repeated Slack API calls
const USER_CACHE_TTL_MS = 30 * 60 * 1000;
const globalUserCache = new Map<string, CachedUserName>();

export class ThreadService {
  private client: WebClient;
  private teamId: string;

  constructor(client: WebClient, teamId?: string) {
    this.client = client;
    this.teamId = teamId || "default";
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

    const validMessages = result.messages.filter(
      (msg) => msg.text && msg.ts && !msg.bot_id
    );

    const uniqueUserIds = [
      ...new Set(validMessages.map((msg) => msg.user).filter(Boolean)),
    ] as string[];

    await Promise.all(
      uniqueUserIds.map((userId) => this.resolveUserName(userId))
    );

    const messages: ThreadMessage[] = validMessages.map((msg) => ({
      userId: msg.user || "unknown",
      userName: msg.user ? this.getCachedUserName(msg.user) : "Unknown",
      text: this.cleanSlackText(msg.text!),
      timestamp: msg.ts!,
      threadTs: msg.thread_ts,
    }));

    return messages;
  }

  /**
   * Clean Slack message text by converting link format to display text only.
   * Slack encodes links as <URL|display_text> or <URL>.
   */
  private cleanSlackText(text: string): string {
    let cleaned = text.replace(/<([^|>]+)\|([^>]+)>/g, "$2");
    cleaned = cleaned.replace(/<(https?:\/\/[^>]+)>/g, "");

    return cleaned.trim();
  }

  private getCacheKey(userId: string): string {
    return `${this.teamId}:${userId}`;
  }

  private getCachedUserName(userId: string): string {
    const cacheKey = this.getCacheKey(userId);
    const cached = globalUserCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.name;
    }
    return userId;
  }

  private async resolveUserName(userId: string): Promise<string> {
    const cacheKey = this.getCacheKey(userId);

    const cached = globalUserCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.name;
    }

    try {
      const result = await this.client.users.info({ user: userId });

      if (result.user) {
        const name =
          result.user.real_name ||
          result.user.name ||
          result.user.profile?.display_name ||
          userId;

        globalUserCache.set(cacheKey, {
          name,
          expiresAt: Date.now() + USER_CACHE_TTL_MS,
        });

        return name;
      }
    } catch (error) {
      logger.warn({ userId, error }, "Failed to resolve user name");
    }

    return userId;
  }
}

/**
 * Clear global user cache (for testing or maintenance).
 */
export function clearGlobalUserCache(): void {
  globalUserCache.clear();
}
