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

  return `You are summarizing a Slack thread for a user who may not speak the original language.
Provide a comprehensive summary in ${languageName}.

Your summary should include:
- Main topic and context of the discussion
- Key points and arguments made by participants
- Any decisions that were made
- Action items or next steps (if mentioned)
- Unresolved questions or blockers (if any)

The summary should be detailed enough (5-10 sentences) that the reader fully understands what was discussed without reading the original thread.

Output as JSON: {"overview": "your detailed summary here"}

Thread:
${threadContent}`;
}

export function buildTranslationPrompt(
  message: ThreadMessage,
  targetLanguage: SupportedLanguage
): string {
  const languageName = LANGUAGE_NAMES[targetLanguage];

  return `Translate this Slack message to ${languageName}.
Preserve the original tone, meaning, and any formatting.
If there are cultural references, idioms, or technical terms that might be unclear, add brief clarifying notes in parentheses.

Output as JSON: {"overview": "your full translation here"}

Message from ${message.userName}:
${message.text}`;
}
