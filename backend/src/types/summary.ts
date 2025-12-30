export type SupportedLanguage =
  | "ja"
  | "en"
  | "zh"
  | "ko"
  | "es"
  | "fr"
  | "de";

export interface TodoItem {
  text: string;
  assignee?: string;
  due?: string | null;
}

export interface StructuredSummary {
  title: string;
  overview: string;
  decisions: string[];
  todos: TodoItem[];
  blockers: string[];
  techNotes: string[];
  language: SupportedLanguage;
}

export interface ThreadMessage {
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  threadTs?: string;
}

export interface SummaryRequest {
  channelId: string;
  threadTs: string;
  userId?: string;
  targetLanguage?: SupportedLanguage;
}

export interface SummaryResponse {
  status: "ok" | "error";
  summary?: StructuredSummary;
  errorCode?: string;
  message?: string;
}
