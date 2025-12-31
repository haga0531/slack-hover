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

  return `Summarize this Slack thread in ${languageName} for someone who doesn't speak the original language.

Guidelines:
- 3-5 sentences
- Include: main topic, key conclusion or decision (if any), next steps (if any)
- Be concise but informative

Output as JSON: {"overview": "your summary"}

Thread:
${threadContent}`;
}

export function buildTranslationPrompt(
  message: ThreadMessage,
  targetLanguage: SupportedLanguage
): string {
  const languageName = LANGUAGE_NAMES[targetLanguage];

  return `Translate this Slack message to ${languageName}. Preserve tone and meaning.

Output as JSON: {"overview": "translated message"}

${message.text}`;
}
