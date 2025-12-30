import type { SupportedLanguage, ThreadMessage } from "../../types/summary.js";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ja: "Japanese",
  en: "English",
  zh: "Chinese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
};

const MAX_MESSAGES_FOR_PROMPT = 30;

export function buildSummaryPrompt(
  messages: ThreadMessage[],
  targetLanguage: SupportedLanguage
): string {
  const languageName = LANGUAGE_NAMES[targetLanguage];

  // Limit messages to reduce input tokens
  const limitedMessages = messages.slice(-MAX_MESSAGES_FOR_PROMPT);

  const threadContent = limitedMessages
    .map((m) => `${m.userName}: ${m.text}`)
    .join("\n");

  return `Summarize this Slack thread in ${languageName}. Output JSON: {"overview":"2-3 sentence summary"}

${threadContent}`;
}

export function buildTranslationPrompt(
  message: ThreadMessage,
  targetLanguage: SupportedLanguage
): string {
  const languageName = LANGUAGE_NAMES[targetLanguage];

  return `Translate this Slack message to ${languageName}. Output JSON: {"overview":"translated message"}

${message.userName}: ${message.text}`;
}
