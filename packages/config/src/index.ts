import { z } from "zod";

export const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  ENABLE_HTTP_API: z.coerce.boolean().default(false),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),

  // Discord credentials
  DISCORD_TOKEN: z.string().min(1).default("dummy-token-for-dev-and-tests"),
  DISCORD_CLIENT_ID: z.string().min(1).default("123456789012345678"),
  DISCORD_PUBLIC_KEY: z.string().optional(),

  // Turso / libSQL
  TURSO_DATABASE_URL: z.string().default("file:devpulse.db"),
  TURSO_AUTH_TOKEN: z.string().optional(),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // GitHub integration
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().optional(),

  // Optional AI integration
  AI_PROVIDER: z.enum(["openai", "anthropic", "gemini", "none"]).default("none"),
  AI_API_KEY: z.string().optional(),

  // Security & Rate Limiting
  RATE_LIMIT_USER_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_USER_WINDOW_SEC: z.coerce.number().int().positive().default(10),
  ENABLE_SECRET_SCANNING: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(customEnv: Record<string, string | undefined> = process.env): Config {
  if (cachedConfig && customEnv === process.env) {
    return cachedConfig;
  }

  const parsed = ConfigSchema.safeParse(customEnv);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration validation error:\n${errorDetails}`);
  }

  if (customEnv === process.env) {
    cachedConfig = parsed.data;
  }
  return parsed.data;
}

export const config = loadConfig();
