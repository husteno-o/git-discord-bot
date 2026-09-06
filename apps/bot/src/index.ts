import { buildServer } from "@devpulse/api";
import { config } from "@devpulse/config";
import { initDatabase } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { scheduler } from "@devpulse/scheduler";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { handleInteraction } from "./events/interactionCreate.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleReady } from "./events/ready.js";

export function createBotClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once("ready", (c) => handleReady(c));
  client.on("interactionCreate", (i) => handleInteraction(i));
  client.on("messageCreate", (m) => handleMessageCreate(m));

  return client;
}

export async function startUnifiedApp() {
  logger.info("Initializing DevPulse Unified Platform (API + Discord Bot)...");

  // 1. Initialize SQLite / libSQL database tables and indexes
  await initDatabase();

  // 2. Initialize Discord Client
  const client = createBotClient();

  // 3. Initialize & start Fastify HTTP API Server (exposes /health, /ready, /metrics)
  const apiServer = buildServer({ discordClient: client });
  try {
    const address = await apiServer.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info({ address }, `DevPulse HTTP API server listening on ${address}`);
  } catch (err) {
    logger.error({ err }, "Failed to bind DevPulse HTTP API server");
    process.exit(1);
  }

  // 4. Graceful shutdown handler
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, "Gracefully shutting down DevPulse unified platform...");
    scheduler.stop();
    try {
      await apiServer.close();
      client.destroy();
      logger.info("DevPulse shutdown completed successfully.");
    } catch (err) {
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
    logger.warn(
      `⚠️  DevPulse HTTP API is running on port ${config.PORT}, but DISCORD_TOKEN in .env is not configured.`,
    );
    logger.warn(
      "👉 Please edit /home/swadhin/discordbot/.env and set your DISCORD_TOKEN and DISCORD_CLIENT_ID to connect to Discord.",
    );
  } else {
    try {
      logger.info("Connecting to Discord Gateway...");
      await client.login(config.DISCORD_TOKEN);
    } catch (err) {
      logger.error({ err }, "Failed to login to Discord Gateway. Check your DISCORD_TOKEN in .env");
    }
  }

  return { client, apiServer };
}

export const startBot = startUnifiedApp;

if (import.meta.main) {
  startUnifiedApp();
}
