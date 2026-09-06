import { config } from "@devpulse/config";
import pino from "pino";

const redactPaths = [
  "*.token",
  "*.apiKey",
  "*.secret",
  "*.password",
  "*.authorization",
  "*.githubToken",
  "*.discordToken",
  "*.auth",
  "req.headers.authorization",
  "headers.authorization",
];

export const baseLogger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export type Logger = pino.Logger;

export function createChildLogger(context: {
  module?: string;
  requestId?: string;
  guildId?: string;
  userId?: string;
  command?: string;
  [key: string]: unknown;
}): Logger {
  return baseLogger.child(context);
}

export const logger = createChildLogger({ module: "devpulse" });
