import type { Router, Request, Response } from "express";
import { z } from "zod";
import { WebClient } from "@slack/web-api";
import { Firestore } from "@google-cloud/firestore";
import { ThreadService } from "../../services/slack/thread.service.js";
import { GeminiService } from "../../services/llm/gemini.service.js";
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

      // Get Slack token from Firestore
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

      // Create Slack client
      const slackClient = new WebClient(token);

      // Fetch thread messages
      const threadService = new ThreadService(slackClient);
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

      const response: SummaryResponse = {
        status: "ok",
        summary,
        messageCount: messages.length,
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
