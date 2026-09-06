import { config } from "@devpulse/config";
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

export async function startBot() {
  const client = createBotClient();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Gracefully shutting down DevPulse bot...");
    scheduler.stop();
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    logger.info("Logging into Discord gateway...");
    await client.login(config.DISCORD_TOKEN);
  } catch (err) {
    logger.error({ err }, "Failed to login to Discord gateway");
    process.exit(1);
  }

  return client;
}

if (import.meta.main) {
  startBot();
}
