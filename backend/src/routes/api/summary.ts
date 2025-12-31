import type { Router, Request, Response } from "express";
import { z } from "zod";
import { WebClient } from "@slack/web-api";
import { Firestore } from "@google-cloud/firestore";
import { ThreadService } from "../../services/slack/thread.service.js";
import { GeminiService } from "../../services/llm/gemini.service.js";
import { CacheRepository } from "../../repositories/cache.repository.js";
import { logger } from "../../middleware/logger.js";
import { env } from "../../config/env.js";
import type { SummaryResponse, SupportedLanguage } from "../../types/summary.js";

const summaryRequestSchema = z.object({
  channel_id: z.string().min(1),
  thread_ts: z.string().min(1),
  user_id: z.string().optional(),
  target_lang: z
    .enum(["ja", "en", "zh", "ko", "es", "fr", "de"])
    .default("ja"),
  team_id: z.string().min(1),
});

export function setupSummaryRoute(router: Router) {
  router.post("/api/summary", async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();

    try {
      // Validate request body
      const parseResult = summaryRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        logger.warn(
          { requestId, errors: parseResult.error.format() },
          "Invalid request"
        );
        const response: SummaryResponse = {
          status: "error",
          errorCode: "VALIDATION_ERROR",
          message: "Invalid request parameters",
        };
        res.status(400).json(response);
        return;
      }

      const { channel_id, thread_ts, target_lang, team_id } = parseResult.data;

      // Get Slack token from Firestore (validates workspace access)
      const token = await getSlackToken(team_id);

      if (!token) {
        const response: SummaryResponse = {
          status: "error",
          errorCode: "NOT_INSTALLED",
          message: "Slack app is not installed for this workspace",
        };
        res.status(401).json(response);
        return;
      }

      // Create Slack client to get current message count
      const slackClient = new WebClient(token);
      const threadService = new ThreadService(slackClient);

      // Fetch thread messages to get current count
      const messages = await threadService.fetchThreadMessages(
        channel_id,
        thread_ts
      );

      if (messages.length === 0) {
        const response: SummaryResponse = {
          status: "error",
          errorCode: "THREAD_NOT_FOUND",
          message: "No messages found in this thread",
        };
        res.status(404).json(response);
        return;
      }

      const currentMessageCount = messages.length;

      // Debug: Log message content
      logger.info(
        {
          requestId,
          messages: messages.map((m) => ({
            userName: m.userName,
            text: m.text,
            textLength: m.text.length,
          })),
        },
        "Fetched thread messages"
      );

      // Check cache first (with message count validation)
      const cached = await CacheRepository.get(
        team_id,
        channel_id,
        thread_ts,
        target_lang as SupportedLanguage,
        currentMessageCount
      );

      if (cached) {
        logger.info(
          { requestId, team_id, channel_id, thread_ts, target_lang },
          "Returning cached summary"
        );

        const response: SummaryResponse = {
          status: "ok",
          summary: cached.summary,
          messageCount: cached.messageCount,
        };

        res.json(response);
        return;
      }

      // Cache miss - generate new summary
      logger.info(
        { requestId, team_id, channel_id, thread_ts, target_lang, messageCount: currentMessageCount },
        "Generating new summary"
      );

      // Generate summary or translate single message
      const geminiService = new GeminiService();
      const summary =
        messages.length === 1
          ? await geminiService.translateMessage(
              messages[0],
              target_lang as SupportedLanguage
            )
          : await geminiService.summarizeThread(
              messages,
              target_lang as SupportedLanguage
            );

      // Store in cache (async, don't wait)
      CacheRepository.set(
        team_id,
        channel_id,
        thread_ts,
        target_lang as SupportedLanguage,
        summary,
        currentMessageCount
      ).catch((error) => {
        logger.error({ requestId, error }, "Failed to cache summary");
      });

      const response: SummaryResponse = {
        status: "ok",
        summary,
        messageCount: currentMessageCount,
      };

      res.json(response);
    } catch (error) {
      logger.error({ requestId, error }, "Error processing summary request");

      const response: SummaryResponse = {
        status: "error",
        errorCode: "INTERNAL_ERROR",
        message: "An error occurred while generating the summary",
      };

      res.status(500).json(response);
    }
  });
}

async function getSlackToken(teamId: string): Promise<string | null> {
  try {
    const firestore = new Firestore({ projectId: env.GCP_PROJECT_ID });
    const doc = await firestore
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

    // Return bot token
    return installation.bot?.token || null;
  } catch (error) {
    logger.error({ teamId, error }, "Failed to get Slack token");
    return null;
  }
}
