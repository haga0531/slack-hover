import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env module before importing GeminiService
vi.mock("../../../config/env.js", () => ({
  env: {
    GCP_PROJECT_ID: "test-project",
    VERTEX_AI_REGION: "us-central1",
    GEMINI_MODEL: "gemini-1.5-flash",
  },
}));

// Mock logger
vi.mock("../../../middleware/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { GeminiService } from "../../../services/llm/gemini.service.js";
import type { ThreadMessage } from "../../../types/summary.js";

describe("GeminiService", () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));

  const mockVertexAI = {
    getGenerativeModel: mockGetGenerativeModel,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("summarizeThread", () => {
    const mockMessages: ThreadMessage[] = [
      {
        userId: "U123",
        userName: "Alice",
        text: "Let's discuss the API",
        timestamp: "1234567890.123456",
      },
      {
        userId: "U456",
        userName: "Bob",
        text: "Sounds good",
        timestamp: "1234567890.123457",
      },
    ];

    it("should return structured summary on success", async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      overview: "Discussion about API design",
                    }),
                  },
                ],
              },
            },
          ],
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const service = new GeminiService({
        vertexAI: mockVertexAI,
        config: {
          projectId: "test-project",
          location: "us-central1",
          model: "gemini-test",
        },
      });

      const result = await service.summarizeThread(mockMessages, "en");

      expect(result).toEqual({
        overview: "Discussion about API design",
        language: "en",
      });
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-test",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      });
    });

    it("should throw error when response is empty", async () => {
      const mockResponse = {
        response: {
          candidates: [],
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const service = new GeminiService({
        vertexAI: mockVertexAI,
        config: {
          projectId: "test-project",
          location: "us-central1",
          model: "gemini-test",
        },
      });

      await expect(service.summarizeThread(mockMessages, "en")).rejects.toThrow(
        "Empty response from Gemini"
      );
    });

    it("should throw error when generateContent fails", async () => {
      mockGenerateContent.mockRejectedValue(new Error("API Error"));

      const service = new GeminiService({
        vertexAI: mockVertexAI,
        config: {
          projectId: "test-project",
          location: "us-central1",
          model: "gemini-test",
        },
      });

      await expect(service.summarizeThread(mockMessages, "en")).rejects.toThrow(
        "API Error"
      );
    });
  });

  describe("translateMessage", () => {
    const mockMessage: ThreadMessage = {
      userId: "U123",
      userName: "Alice",
      text: "これは日本語です",
      timestamp: "1234567890.123456",
    };

    it("should return translated message on success", async () => {
      const mockResponse = {
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      overview: "This is Japanese",
                    }),
                  },
                ],
              },
            },
          ],
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const service = new GeminiService({
        vertexAI: mockVertexAI,
        config: {
          projectId: "test-project",
          location: "us-central1",
          model: "gemini-test",
        },
      });

      const result = await service.translateMessage(mockMessage, "en");

      expect(result).toEqual({
        overview: "This is Japanese",
        language: "en",
      });
    });

    it("should throw error when response is empty", async () => {
      const mockResponse = {
        response: {
          candidates: [{ content: { parts: [] } }],
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const service = new GeminiService({
        vertexAI: mockVertexAI,
        config: {
          projectId: "test-project",
          location: "us-central1",
          model: "gemini-test",
        },
      });

      await expect(service.translateMessage(mockMessage, "en")).rejects.toThrow(
        "Empty response from Gemini"
      );
    });
  });

  describe("constructor", () => {
    it("should use provided config", () => {
      const service = new GeminiService({
        vertexAI: mockVertexAI,
        config: {
          projectId: "custom-project",
          location: "asia-northeast1",
          model: "custom-model",
        },
      });

      // Verify the service was created (we can't directly check private fields)
      expect(service).toBeInstanceOf(GeminiService);
    });
  });
});
