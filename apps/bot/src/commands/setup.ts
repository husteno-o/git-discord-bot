import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const setupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Guided onboarding wizard to configure DevPulse for your engineering server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = createBaseEmbed("🚀 Welcome to DevPulse (RavenDev) Setup Wizard")
      .setColor(BrandColors.primary)
      .setDescription(
        "DevPulse is your developer operating system inside Discord. Follow these 5 quick steps to configure your server:\n\n" +
          "**1. Configure Default Alert Channel**\n" +
          "Run `/settings set-channel #dev-alerts` to designate a channel for uptime alerts and release digests.\n\n" +
          "**2. Set Server Timezone**\n" +
          "Run `/settings timezone America/New_York` (or your team's primary timezone) for accurate schedule and reminder calculations.\n\n" +
          "**3. Connect Your GitHub Identity**\n" +
          "Every engineer can run `/dev link-github <username>` to bind their GitHub account for personal telemetry and daily standups.\n\n" +
          "**4. Add Monitored Endpoints & Repositories**\n" +
          "• Monitor staging/production uptime: `/monitor add https://api.yourcompany.com`\n" +
          "• Inspect your core repositories: `/github repo your-org/core-service`\n\n" +
          "**5. Register Project Memory**\n" +
          "Run `/project add RavenBot Bun,TypeScript,Fastify` to establish server architectural context.\n\n" +
          "🛡️ *Zero-Log Secret Scanning is ENABLED by default to protect your team against accidental token leaks.*",
      )
      .setFooter({ text: "Run /help at any time to explore all commands." });

    await interaction.reply({ embeds: [embed] });
  },
};
