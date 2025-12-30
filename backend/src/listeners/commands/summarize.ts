import type { App, SlashCommand } from "@slack/bolt";
import { ThreadService } from "../../services/slack/thread.service.js";
import { GeminiService } from "../../services/llm/gemini.service.js";
import { logger } from "../../middleware/logger.js";
import { parseTargetLanguage, formatSummaryForSlack } from "./helpers.js";

export function registerSummarizeCommand(app: App) {
  app.command("/summarize", async ({ command, ack, client, respond }) => {
    await ack();

    const { channel_id, text } = command;

    try {
      // Parse target language from command text (e.g., "/summarize ja" or "/summarize en")
      const targetLanguage = parseTargetLanguage(text);

      // Get thread_ts from the command context
      // Note: Slash commands don't have thread_ts directly, user needs to run in thread
      const threadTs = extractThreadTs(command);

      if (!threadTs) {
        await respond({
          response_type: "ephemeral",
          text: "Please run this command in a thread, or provide a message link.\nUsage: `/summarize [language]` (e.g., `/summarize ja`)",
        });
        return;
      }

      // Show loading message
      await respond({
        response_type: "ephemeral",
        text: "Summarizing thread... Please wait.",
      });

      // Fetch thread messages
      const threadService = new ThreadService(client);
      const messages = await threadService.fetchThreadMessages(
        channel_id,
        threadTs
      );

      if (messages.length === 0) {
        await respond({
          response_type: "ephemeral",
          text: "No messages found in this thread.",
        });
        return;
      }

      // Generate summary
      const geminiService = new GeminiService();
      const summary = await geminiService.summarizeThread(
        messages,
        targetLanguage
      );

      // Format and send response
      const formattedSummary = formatSummaryForSlack(summary);

      await respond({
        response_type: "ephemeral",
        blocks: formattedSummary,
      });
    } catch (error) {
      logger.error({ error }, "Error processing summarize command");

      await respond({
        response_type: "ephemeral",
        text: "Sorry, an error occurred while generating the summary. Please try again later.",
      });
    }
  });
}

function extractThreadTs(_command: SlashCommand): string | null {
  // In Slack, when a slash command is run in a thread,
  // the thread_ts is not directly available in the command payload.
  // Users need to provide a message link or use message shortcuts instead.
  // For MVP, we'll return null and guide users to use message shortcuts.
  return null;
}
