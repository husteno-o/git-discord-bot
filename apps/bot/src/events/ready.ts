import { initDatabase } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { type DueReminder, scheduler } from "@devpulse/scheduler";
import {
  ActivityType,
  ApplicationIntegrationType,
  type Client,
  InteractionContextType,
} from "discord.js";
import { commands } from "../commands/index.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";

export async function handleReady(client: Client<true>): Promise<void> {
  logger.info({ user: client.user.tag }, "GITBOT logged in successfully");

  // 1. Initialize database schema
  await initDatabase();

  // 2. Set bot presence
  client.user.setPresence({
    activities: [
      {
        name: "GITBOT Terminal | /help",
        type: ActivityType.Custom,
      },
    ],
    status: "online",
  });

  // 3. Register Slash Commands (Supporting Server Installs & User Account Installs)
  try {
    logger.info("Registering slash commands with Discord REST API (Server + User App support)...");
    const commandData = commands.map((c) => {
      const data = c.data as any;
      if (typeof data.setIntegrationTypes === "function") {
        data.setIntegrationTypes([
          ApplicationIntegrationType.GuildInstall,
          ApplicationIntegrationType.UserInstall,
        ]);
      }
      if (typeof data.setContexts === "function") {
        data.setContexts([
          InteractionContextType.Guild,
          InteractionContextType.BotDM,
          InteractionContextType.PrivateChannel,
        ]);
      }
      return data;
    });
    await client.application.commands.set(commandData);
    logger.info(
      { commandCount: commands.length },
      "Slash commands registered successfully with Server & User App contexts",
    );
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }

  // 4. Wire background scheduler callbacks
  scheduler.setReminderHandler(async (reminder: DueReminder) => {
    try {
      const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
      if (channel && "send" in channel) {
        await channel.send({
          content: `<@${reminder.userId}> ⏰ **Reminder**: ${reminder.message}`,
        });
      }
    } catch (err) {
      logger.error(
        { err, reminderId: reminder.id },
        "Failed to deliver scheduled reminder message",
      );
    }
  });

  scheduler.setMonitorAlertHandler(async (outcome: any) => {
    try {
      // Find server's notification channel or system channel
      const guild = await client.guilds.fetch(outcome.guildId).catch(() => null);
      if (!guild) return;

      const channel =
        guild.systemChannel || guild.channels.cache.find((c) => c.isTextBased() && "send" in c);
      if (channel && "send" in channel) {
        const isUp = outcome.isHealthy;
        const color = isUp ? BrandColors.success : BrandColors.danger;
        const title = isUp ? `${NF.check} Monitor Recovered` : `${NF.cross} Monitor Down Alert`;

        const embed = createBaseEmbed(title)
          .setColor(color)
          .setDescription(
            `**Target:** \`${outcome.url}\` (${outcome.name})\n**Status:** \`${outcome.statusCode ?? "ERROR"}\`\n**Latency:** \`${outcome.responseTimeMs}ms\`\n${outcome.errorMessage ? `**Reason:** ${outcome.errorMessage}` : ""}`,
          );

        await (channel as any).send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error({ err }, "Failed to deliver monitor alert message");
    }
  });

  // 5. Start background scheduler
  scheduler.start(30000);
}
