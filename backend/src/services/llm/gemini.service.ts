import { VertexAI } from "@google-cloud/vertexai";
import { env } from "../../config/env.js";
import { logger } from "../../middleware/logger.js";
import type {
  StructuredSummary,
  SupportedLanguage,
  ThreadMessage,
} from "../../types/summary.js";
import { buildSummaryPrompt } from "./prompts.js";

export class GeminiService {
  private vertexAI: VertexAI;
  private model: string;

  constructor() {
    this.vertexAI = new VertexAI({
      project: env.GCP_PROJECT_ID,
      location: env.VERTEX_AI_REGION,
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
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

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
      logger.error(
        {
          error,
          errorName: error instanceof Error ? error.name : "Unknown",
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          model: this.model,
          project: env.GCP_PROJECT_ID,
          vertexAiRegion: env.VERTEX_AI_REGION,
        },
        "Failed to generate summary"
      );
      throw error;
    }
  }
}
