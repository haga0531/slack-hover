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

export const JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    overview: { type: "string" },
    decisions: {
      type: "array",
      items: { type: "string" },
    },
    todos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          assignee: { type: ["string", "null"] },
          due: { type: ["string", "null"] },
        },
        required: ["text"],
      },
    },
    blockers: {
      type: "array",
      items: { type: "string" },
    },
    techNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["title", "overview", "decisions", "todos", "blockers", "techNotes"],
};
