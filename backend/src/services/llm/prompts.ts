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

export function buildSummaryPrompt(
  messages: ThreadMessage[],
  targetLanguage: SupportedLanguage
): string {
  const languageName = LANGUAGE_NAMES[targetLanguage];

  const threadContent = messages
    .map((m) => `[${m.userName}]: ${m.text}`)
    .join("\n\n");

  return `You are a helpful assistant that summarizes Slack thread conversations.

Analyze the following Slack thread and provide a structured summary in ${languageName}.

## Thread Content:
${threadContent}

## Instructions:
1. Summarize the thread comprehensively
2. Extract key decisions made
3. Identify action items (TODOs) with assignees if mentioned
4. Note any blockers or unresolved issues
5. Include technical notes if relevant (code changes, API details, etc.)

## Output Format:
Respond with a JSON object in the following format:
{
  "title": "A brief title for the thread summary (in ${languageName})",
  "overview": "A 2-3 sentence overview of what the thread discusses (in ${languageName})",
  "decisions": ["List of decisions made in the thread (in ${languageName})"],
  "todos": [
    {
      "text": "Action item description (in ${languageName})",
      "assignee": "Slack user ID if mentioned (e.g., U12345678), or null",
      "due": "Due date if mentioned, or null"
    }
  ],
  "blockers": ["List of blockers or unresolved issues (in ${languageName})"],
  "techNotes": ["Technical details, code snippets mentioned, API changes, etc. (in ${languageName})"]
}

If a section has no items, use an empty array [].
Ensure all text content is in ${languageName}.
Only output the JSON object, no additional text.`;
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
