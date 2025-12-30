import { App, ExpressReceiver, LogLevel } from "@slack/bolt";
import { env } from "./config/env.js";
import { createInstallationStore } from "./repositories/installation.repository.js";
import { registerCommands } from "./listeners/commands/index.js";
import { setupApiRoutes } from "./routes/api/index.js";
import { createLogger } from "./middleware/logger.js";

const logger = createLogger();

// Create Express Receiver with OAuth support
const receiver = new ExpressReceiver({
  signingSecret: env.SLACK_SIGNING_SECRET,
  clientId: env.SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  scopes: [
    "commands",
    "chat:write",
    "channels:history",
    "groups:history",
    "users:read",
  ],
  installationStore: createInstallationStore(),
  installerOptions: {
    directInstall: true,
  },
});

// Create Bolt App
const app = new App({
  receiver,
  logLevel: env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
});

// Register Slack listeners
registerCommands(app);

// Setup custom API routes
setupApiRoutes(receiver.app);

// Health check endpoint
receiver.app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const port = Number(env.PORT);

async function start() {
  try {
    await app.start(port);
    logger.info(`Server is running on port ${port}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

export { app, receiver };
