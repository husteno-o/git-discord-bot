import { buildServer } from "@devpulse/api";
import { config } from "@devpulse/config";
import { initDatabase } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { scheduler } from "@devpulse/scheduler";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { handleInteraction } from "./events/interactionCreate.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleReady } from "./events/ready.js";

export function createBotClient(options?: { enableMessageContent?: boolean }): Client {
  const allowMessageContent = options?.enableMessageContent ?? config.ENABLE_MESSAGE_CONTENT_INTENT;
  const intents = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages];

  if (allowMessageContent) {
    intents.push(GatewayIntentBits.MessageContent);
  }

  const client = new Client({
    intents,
    partials: [Partials.Message, Partials.Channel],
  });

  client.once(Events.ClientReady, (c) => handleReady(c));
  client.on(Events.InteractionCreate, (i) => handleInteraction(i));
  client.on(Events.MessageCreate, (m) => handleMessageCreate(m));

  return client;
}

export async function startUnifiedApp() {
  logger.info("Initializing DevPulse Unified Platform (API + Discord Bot)...");

  // Global error handlers — prevent silent crashes
  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err: Error) => {
    logger.error({ err }, "Uncaught exception — process will exit");
    process.exit(1);
  });

  // Global error handlers — prevent silent crashes
  process.on("unhandledRejection", (reason: unknown) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });
  process.on("uncaughtException", (err: Error) => {
    logger.error({ err }, "Uncaught exception — process will exit");
    process.exit(1);
  });

  // 1. Initialize SQLite / libSQL database tables and indexes
  await initDatabase();

  // 2. Initialize Discord Client
  const client = createBotClient();

  // 3. Conditionally initialize Fastify HTTP API Server (pure Discord bot mode by default)
  let apiServer: ReturnType<typeof buildServer> | null = null;
  if (config.ENABLE_HTTP_API) {
    apiServer = buildServer({ discordClient: client });
    try {
      const address = await apiServer.listen({
        port: config.PORT,
        host: config.HOST,
      });
      logger.info({ address }, `DevPulse HTTP API server listening on ${address}`);
    } catch (err: unknown) {
      logger.error({ err }, "Failed to bind DevPulse HTTP API server");
    }
  } else {
    logger.info("Running in pure Discord bot mode (HTTP API disabled, zero open ports needed)");
  }

  // 4. Graceful shutdown handler
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, "Gracefully shutting down DevPulse platform...");
    scheduler.stop();
    try {
      if (apiServer) {
        await apiServer.close();
      }
      client.destroy();
      logger.info("DevPulse shutdown completed successfully.");
    } catch (err: unknown) {
      logger.error({ err }, "Error occurred during shutdown");
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // 5. Connect to Discord Gateway
  const isDefaultOrPlaceholderToken =
    !config.DISCORD_TOKEN ||
    config.DISCORD_TOKEN === "dummy-token-for-dev-and-tests" ||
    config.DISCORD_TOKEN.startsWith("your_discord_bot_token");

  if (isDefaultOrPlaceholderToken) {
    if (config.ENABLE_HTTP_API) {
      logger.warn(
        `[!] GITBOT HTTP API is running on port ${config.PORT}, but DISCORD_TOKEN in .env is not configured.`,
      );
    } else {
      logger.warn("[!] GITBOT is ready, but DISCORD_TOKEN in .env is not configured.");
    }
    logger.warn(
      "[!] Please edit /home/swadhin/discordbot/.env and set your DISCORD_TOKEN and DISCORD_CLIENT_ID to connect to Discord.",
    );
  } else {
    try {
      logger.info("Connecting to Discord Gateway...");
      await client.login(config.DISCORD_TOKEN);
    } catch (err: unknown) {
      if (
        (err instanceof Error ? err.message : String(err)).includes("disallowed intents") ||
        String(err).includes("disallowed intents")
      ) {
        logger.warn(
          "Used disallowed intents: Message Content Intent is not enabled in the Discord Developer Portal.",
        );
        logger.warn(
          "Retrying connection without MessageContent intent (slash commands and UI will function completely)...",
        );
        const fallbackClient = createBotClient({ enableMessageContent: false });
        try {
          await fallbackClient.login(config.DISCORD_TOKEN);
        } catch (retryErr: unknown) {
          logger.error({ err: retryErr }, "Failed to login to Discord Gateway after fallback.");
        }
      } else {
        logger.error(
          { err },
          "Failed to login to Discord Gateway. Check your DISCORD_TOKEN in .env",
        );
      }
    }
  }

  return { client, apiServer };
}

export const startBot = startUnifiedApp;

if (import.meta.main) {
  startUnifiedApp();
}
