import type { App } from "@slack/bolt";
import { registerSummarizeCommand } from "./summarize.js";

export function registerCommands(app: App) {
  registerSummarizeCommand(app);
}
