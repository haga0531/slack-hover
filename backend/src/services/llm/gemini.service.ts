import { VertexAI, type GenerativeModel } from "@google-cloud/vertexai";
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

const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  temperature: 0.2,
  maxOutputTokens: 1024, // Balance between TTFT and Japanese output length
} as const;

export class GeminiService {
  private vertexAI: VertexAI;
  private model: string;
  private cachedGenerativeModel: GenerativeModel | null = null;

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

  /** Reusing the model instance avoids repeated initialization overhead. */
  private getModel(): GenerativeModel {
    if (!this.cachedGenerativeModel) {
      this.cachedGenerativeModel = this.vertexAI.getGenerativeModel({
        model: this.model,
        generationConfig: GENERATION_CONFIG,
      });
    }
    return this.cachedGenerativeModel;
  }

  private async generateContent(
    prompt: string,
    targetLanguage: SupportedLanguage,
    context: string
  ): Promise<StructuredSummary> {
    const generativeModel = this.getModel();
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      logger.error(
        {
          candidates: JSON.stringify(response.candidates),
          promptFeedback: JSON.stringify(response.promptFeedback),
          finishReason: candidate?.finishReason,
          context,
        },
        "Empty response from Gemini"
      );
      throw new Error(`Empty response from Gemini: ${candidate?.finishReason || "unknown"}`);
    }

    const parsed = JSON.parse(text) as Omit<StructuredSummary, "language">;

    return {
      ...parsed,
      language: targetLanguage,
    };
  }

  async summarizeThread(
    messages: ThreadMessage[],
    targetLanguage: SupportedLanguage
  ): Promise<StructuredSummary> {
    const prompt = buildSummaryPrompt(messages, targetLanguage);

    try {
      return await this.generateContent(prompt, targetLanguage, "summarize");
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
    const prompt = buildTranslationPrompt(message, targetLanguage);

    try {
      return await this.generateContent(prompt, targetLanguage, "translate");
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
