import { db, servers } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { scanForSecrets } from "@devpulse/security";
import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { createDeleteSecretButton } from "../ui/components.js";
import { createSecurityAlertEmbed } from "../ui/embeds.js";

export async function handleMessageCreate(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot || !message.guildId) return;

  try {
    // Check if server has secret scanning enabled
    const server = await db.query.servers.findFirst({
      where: eq(servers.id, message.guildId),
    });

    if (server && !server.secretScanningEnabled) {
      return;
    }

    // Scan for secrets without persisting or logging raw content
    const detected = scanForSecrets(message.content);
    if (detected.length === 0) return;

    logger.warn(
      {
        guildId: message.guildId,
        channelId: message.channelId,
        userId: message.author.id,
        secretType: detected[0].type,
        fingerprint: detected[0].fingerprintHash,
      },
      "Detected potential secret leak in message (credentials NOT logged)",
    );

    const embed = createSecurityAlertEmbed(detected[0]);
    const components = [createDeleteSecretButton(message.id)];

    await message.reply({
      content: `<@${message.author.id}> 🚨 **Security Notice**: A sensitive credential pattern was detected in your message!`,
      embeds: [embed],
      components,
    });
  } catch (err) {
    logger.error({ err }, "Error during secret scanning");
  }
}
