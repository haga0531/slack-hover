import type { Router, Request, Response } from "express";
import { z } from "zod";
import { WebClient } from "@slack/web-api";
import { ThreadService } from "../../services/slack/thread.service.js";
import { GeminiService } from "../../services/llm/gemini.service.js";
import { CacheRepository } from "../../repositories/cache.repository.js";
import { getSlackToken } from "../../repositories/token.repository.js";
import { logger } from "../../middleware/logger.js";
import type { SummaryResponse, SupportedLanguage } from "../../types/summary.js";

// Singleton to avoid repeated model initialization overhead
const geminiService = new GeminiService();

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

      const slackClient = new WebClient(token);
      const threadService = new ThreadService(slackClient, team_id);

      // Parallel fetch: reduces latency by not waiting for cache check before Slack API
      const [messages, cachedWithoutCount] = await Promise.all([
        threadService.fetchThreadMessages(channel_id, thread_ts),
        CacheRepository.get(team_id, channel_id, thread_ts, target_lang as SupportedLanguage),
      ]);

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

      // Invalidate cache if thread has new messages
      if (cachedWithoutCount && cachedWithoutCount.messageCount === currentMessageCount) {
        logger.info(
          { requestId, team_id, channel_id, thread_ts, target_lang },
          "Returning cached summary"
        );

        const response: SummaryResponse = {
          status: "ok",
          summary: cachedWithoutCount.summary,
          messageCount: cachedWithoutCount.messageCount,
        };

        res.json(response);
        return;
      }

      logger.info(
        { requestId, team_id, channel_id, thread_ts, target_lang, messageCount: currentMessageCount },
        "Generating new summary"
      );

      // Single message → translate, multiple → summarize
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

      // Fire-and-forget: don't block response for cache write
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
