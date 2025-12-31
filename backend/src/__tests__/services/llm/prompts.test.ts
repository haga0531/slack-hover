import { describe, it, expect } from "vitest";
import {
  buildSummaryPrompt,
  buildTranslationPrompt,
} from "../../../services/llm/prompts.js";
import type { ThreadMessage } from "../../../types/summary.js";

describe("buildSummaryPrompt", () => {
  const mockMessages: ThreadMessage[] = [
    {
      userId: "U123",
      userName: "Alice",
      text: "Let's discuss the API design",
      timestamp: "1234567890.123456",
    },
    {
      userId: "U456",
      userName: "Bob",
      text: "I think we should use REST",
      timestamp: "1234567890.123457",
    },
  ];

  it("should build a prompt in Japanese", () => {
    const prompt = buildSummaryPrompt(mockMessages, "ja");
    expect(prompt).toContain("Japanese");
    expect(prompt).toContain("Alice: Let's discuss the API design");
    expect(prompt).toContain("Bob: I think we should use REST");
    expect(prompt).toContain('{"overview"');
  });

  it("should build a prompt in English", () => {
    const prompt = buildSummaryPrompt(mockMessages, "en");
    expect(prompt).toContain("English");
  });

  it("should build a prompt in Chinese", () => {
    const prompt = buildSummaryPrompt(mockMessages, "zh");
    expect(prompt).toContain("Chinese");
  });

  it("should build a prompt in Korean", () => {
    const prompt = buildSummaryPrompt(mockMessages, "ko");
    expect(prompt).toContain("Korean");
  });

  it("should build a prompt in Spanish", () => {
    const prompt = buildSummaryPrompt(mockMessages, "es");
    expect(prompt).toContain("Spanish");
  });

  it("should build a prompt in French", () => {
    const prompt = buildSummaryPrompt(mockMessages, "fr");
    expect(prompt).toContain("French");
  });

  it("should build a prompt in German", () => {
    const prompt = buildSummaryPrompt(mockMessages, "de");
    expect(prompt).toContain("German");
  });

  it("should limit messages to MAX_MESSAGES_FOR_PROMPT (30)", () => {
    const manyMessages: ThreadMessage[] = Array.from({ length: 50 }, (_, i) => ({
      userId: `U${i}`,
      userName: `User${i}`,
      text: `Message ${i}`,
      timestamp: `123456789${i}.123456`,
    }));

    const prompt = buildSummaryPrompt(manyMessages, "ja");
    // Should only include last 30 messages
    expect(prompt).toContain("User20");
    expect(prompt).toContain("User49");
    expect(prompt).not.toContain("User0:");
    expect(prompt).not.toContain("User19:");
  });

  it("should handle empty messages array", () => {
    const prompt = buildSummaryPrompt([], "ja");
    expect(prompt).toContain("Japanese");
    expect(prompt).toContain('{"overview"');
  });
});

describe("buildTranslationPrompt", () => {
  const mockMessage: ThreadMessage = {
    userId: "U123",
    userName: "Alice",
    text: "これは日本語のメッセージです",
    timestamp: "1234567890.123456",
  };

  it("should build a translation prompt in English", () => {
    const prompt = buildTranslationPrompt(mockMessage, "en");
    expect(prompt).toContain("Translate");
    expect(prompt).toContain("English");
    expect(prompt).toContain("Alice:");
    expect(prompt).toContain("これは日本語のメッセージです");
    expect(prompt).toContain('{"overview"');
  });

  it("should build a translation prompt in Japanese", () => {
    const prompt = buildTranslationPrompt(mockMessage, "ja");
    expect(prompt).toContain("Japanese");
  });

  it("should include userName and text in the prompt", () => {
    const prompt = buildTranslationPrompt(mockMessage, "en");
    expect(prompt).toContain("Alice:");
    expect(prompt).toContain("これは日本語のメッセージです");
  });
});
