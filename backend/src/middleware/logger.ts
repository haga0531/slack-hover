import pino from "pino";
import { env } from "../config/env.js";

export function createLogger() {
  return pino({
    level: env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
            },
          }
        : undefined,
  });
}

export const logger = createLogger();
