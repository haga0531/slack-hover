import { VertexAI } from "@google-cloud/vertexai";
import { env } from "../../config/env.js";
import { logger } from "../../middleware/logger.js";
import type {
  StructuredSummary,
  SupportedLanguage,
  ThreadMessage,
} from "../../types/summary.js";
import { buildSummaryPrompt, buildTranslationPrompt } from "./prompts.js";

export interface GeminiServiceConfig {
  projectId: string;
  location: string;
  model: string;
}

export interface GeminiServiceDeps {
  vertexAI?: VertexAI;
  config?: GeminiServiceConfig;
}

export class GeminiService {
  private vertexAI: VertexAI;
  private model: string;

  constructor(deps?: GeminiServiceDeps) {
    const config = deps?.config ?? {
      projectId: env.GCP_PROJECT_ID,
      location: env.VERTEX_AI_REGION,
      model: env.GEMINI_MODEL,
    };

    this.vertexAI =
      deps?.vertexAI ??
      new VertexAI({
        project: config.projectId,
        location: config.location,
      });
    this.model = config.model;
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
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;

      logger.debug(
        {
          candidates: response.candidates,
          promptFeedback: response.promptFeedback,
        },
        "Gemini raw response"
      );

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        logger.error(
          {
            candidates: JSON.stringify(response.candidates),
            promptFeedback: JSON.stringify(response.promptFeedback),
          },
          "Empty response from Gemini"
        );
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

  async translateMessage(
    message: ThreadMessage,
    targetLanguage: SupportedLanguage
  ): Promise<StructuredSummary> {
    logger.debug({ targetLanguage }, "Translating single message");

    const prompt = buildTranslationPrompt(message, targetLanguage);

    try {
      const generativeModel = this.vertexAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });

      const result = await generativeModel.generateContent(prompt);
      const response = result.response;

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        logger.error(
          {
            candidates: JSON.stringify(response.candidates),
            promptFeedback: JSON.stringify(response.promptFeedback),
          },
          "Empty response from Gemini (translate)"
        );
        throw new Error("Empty response from Gemini");
      }

      const parsed = JSON.parse(text) as Omit<StructuredSummary, "language">;

      logger.info({ targetLanguage }, "Translation generated successfully");

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
        },
        "Failed to translate message"
      );
      throw error;
    }
  }
}
