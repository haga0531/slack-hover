import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { logger } from "../../middleware/logger.js";
import type {
  StructuredSummary,
  SupportedLanguage,
  ThreadMessage,
} from "../../types/summary.js";
import { buildSummaryPrompt, JSON_SCHEMA } from "./prompts.js";

export class GeminiService {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    this.client = new GoogleGenAI({
      vertexai: true,
      project: env.GCP_PROJECT_ID,
      location: env.GCP_REGION,
    });
    this.model = env.GEMINI_MODEL;
  }

  async summarizeThread(
    messages: ThreadMessage[],
    targetLanguage: SupportedLanguage
  ): Promise<StructuredSummary> {
    logger.debug(
      { messageCount: messages.length, targetLanguage },
      "Generating summary"
    );

    const prompt = buildSummaryPrompt(messages, targetLanguage);

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: JSON_SCHEMA,
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const text = response.text;

      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      const parsed = JSON.parse(text) as Omit<StructuredSummary, "language">;

      logger.info({ targetLanguage }, "Summary generated successfully");

      return {
        ...parsed,
        language: targetLanguage,
      };
    } catch (error) {
      logger.error({ error }, "Failed to generate summary");
      throw new Error("Failed to generate summary");
    }
  }
}
