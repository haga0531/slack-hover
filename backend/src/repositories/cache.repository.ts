import { Firestore, Timestamp } from "@google-cloud/firestore";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";
import type { StructuredSummary, SupportedLanguage } from "../types/summary.js";

const COLLECTION_NAME = "summary_cache";
const CACHE_TTL_DAYS = 90;

export interface CacheEntry {
  summary: StructuredSummary;
  messageCount: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

interface CacheDocument {
  summary: StructuredSummary;
  messageCount: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

let firestore: Firestore | null = null;

function getFirestore(): Firestore {
  if (!firestore) {
    firestore = new Firestore({
      projectId: env.GCP_PROJECT_ID,
      ignoreUndefinedProperties: true,
    });
  }
  return firestore;
}

/**
 * Generate a secure cache key.
 * Format: {teamId}:{channelId}:{threadTs}:{language}
 *
 * Security: teamId is included to ensure workspace isolation.
 * Users can only access cache for their own workspace.
 */
function generateCacheKey(
  teamId: string,
  channelId: string,
  threadTs: string,
  language: SupportedLanguage
): string {
  // Validate inputs to prevent injection
  if (!isValidSlackId(teamId) || !isValidSlackId(channelId) || !isValidTimestamp(threadTs)) {
    throw new Error("Invalid cache key parameters");
  }
  return `${teamId}:${channelId}:${threadTs}:${language}`;
}

/**
 * Validate Slack ID format (team/channel/user IDs)
 * Valid formats: T12345678, C12345678, etc.
 */
function isValidSlackId(id: string): boolean {
  return /^[A-Z][A-Z0-9]{8,}$/.test(id);
}

/**
 * Validate Slack timestamp format
 * Valid format: 1234567890.123456
 */
function isValidTimestamp(ts: string): boolean {
  return /^\d+\.\d+$/.test(ts);
}

export const CacheRepository = {
  /**
   * Get cached summary if exists and not expired.
   * Returns null if cache miss, expired, or message count changed.
   */
  async get(
    teamId: string,
    channelId: string,
    threadTs: string,
    language: SupportedLanguage,
    expectedMessageCount?: number
  ): Promise<CacheEntry | null> {
    try {
      const db = getFirestore();
      const cacheKey = generateCacheKey(teamId, channelId, threadTs, language);

      const doc = await db.collection(COLLECTION_NAME).doc(cacheKey).get();

      if (!doc.exists) {
        logger.debug({ teamId, channelId, threadTs, language }, "Cache miss: not found");
        return null;
      }

      const data = doc.data() as CacheDocument;

      // Check if expired
      const now = Timestamp.now();
      if (data.expiresAt.toMillis() < now.toMillis()) {
        logger.debug({ teamId, channelId, threadTs, language }, "Cache miss: expired");
        // Optionally delete expired entry
        await doc.ref.delete().catch(() => {});
        return null;
      }

      // Check if message count changed (cache invalidation)
      if (expectedMessageCount !== undefined && data.messageCount !== expectedMessageCount) {
        logger.debug(
          { teamId, channelId, threadTs, language, cached: data.messageCount, expected: expectedMessageCount },
          "Cache miss: message count changed"
        );
        return null;
      }

      logger.info({ teamId, channelId, threadTs, language }, "Cache hit");
      return {
        summary: data.summary,
        messageCount: data.messageCount,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      };
    } catch (error) {
      logger.error({ teamId, channelId, threadTs, language, error }, "Cache get error");
      return null;
    }
  },

  /**
   * Store summary in cache.
   */
  async set(
    teamId: string,
    channelId: string,
    threadTs: string,
    language: SupportedLanguage,
    summary: StructuredSummary,
    messageCount: number
  ): Promise<void> {
    try {
      const db = getFirestore();
      const cacheKey = generateCacheKey(teamId, channelId, threadTs, language);

      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(
        now.toMillis() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
      );

      const cacheDoc: CacheDocument = {
        summary,
        messageCount,
        createdAt: now,
        expiresAt,
      };

      await db.collection(COLLECTION_NAME).doc(cacheKey).set(cacheDoc);

      logger.info({ teamId, channelId, threadTs, language, messageCount }, "Cache set");
    } catch (error) {
      // Cache write failure should not break the main flow
      logger.error({ teamId, channelId, threadTs, language, error }, "Cache set error");
    }
  },

  /**
   * Delete cached entry (for manual invalidation if needed).
   */
  async delete(
    teamId: string,
    channelId: string,
    threadTs: string,
    language: SupportedLanguage
  ): Promise<void> {
    try {
      const db = getFirestore();
      const cacheKey = generateCacheKey(teamId, channelId, threadTs, language);

      await db.collection(COLLECTION_NAME).doc(cacheKey).delete();

      logger.info({ teamId, channelId, threadTs, language }, "Cache deleted");
    } catch (error) {
      logger.error({ teamId, channelId, threadTs, language, error }, "Cache delete error");
    }
  },
};
