import { Firestore } from "@google-cloud/firestore";
import { env } from "../config/env.js";
import { logger } from "../middleware/logger.js";

interface CachedToken {
  token: string;
  expiresAt: number;
}

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const tokenCache = new Map<string, CachedToken>();

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
 * Get Slack token with in-memory caching.
 * Reduces Firestore reads for repeated requests from the same workspace.
 */
export async function getSlackToken(teamId: string): Promise<string | null> {
  const cached = tokenCache.get(teamId);
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug({ teamId }, "Token cache hit");
    return cached.token;
  }

  try {
    const db = getFirestore();
    const doc = await db
      .collection("slack_installations")
      .doc(teamId)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    const installation = data?.installation;

    if (!installation) {
      return null;
    }

    const token = installation.bot?.token || null;

    if (token) {
      tokenCache.set(teamId, {
        token,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
      });
      logger.debug({ teamId }, "Token cached");
    }

    return token;
  } catch (error) {
    logger.error({ teamId, error }, "Failed to get Slack token");
    return null;
  }
}

/**
 * Clear cached token (useful when token is revoked or updated).
 */
export function clearTokenCache(teamId: string): void {
  tokenCache.delete(teamId);
}

/**
 * Clear all cached tokens.
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}
