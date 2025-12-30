import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.string().default("8080"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Slack
  SLACK_CLIENT_ID: z.string().min(1, "SLACK_CLIENT_ID is required"),
  SLACK_CLIENT_SECRET: z.string().min(1, "SLACK_CLIENT_SECRET is required"),
  SLACK_SIGNING_SECRET: z.string().min(1, "SLACK_SIGNING_SECRET is required"),
  SLACK_STATE_SECRET: z.string().min(1, "SLACK_STATE_SECRET is required"),

  // Google Cloud
  GCP_PROJECT_ID: z.string().min(1, "GCP_PROJECT_ID is required"),
  GCP_REGION: z.string().default("asia-northeast1"),
  VERTEX_AI_REGION: z.string().default("asia-northeast1"),

  // Feature Flags
  ENABLE_TRANSLATION: z
    .string()
    .transform((val) => val === "true")
    .default("true"),
  MAX_THREAD_MESSAGES: z.coerce.number().default(100),

  // LLM
  GEMINI_MODEL: z.string().default("gemini-2.5-pro"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Environment validation failed:");
    console.error(result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = validateEnv();
