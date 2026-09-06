import { db, serverSettings, servers } from "@devpulse/database";
import { requirePermission } from "@devpulse/permissions";
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const settingsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Server administration and platform configuration (Admins only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current server configuration and policy toggles"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Set default alert and notification channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Discord text channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle-secrets")
        .setDescription("Enable or disable automatic zero-log secret leak detection")
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("True to enable, false to disable")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle-ai")
        .setDescription("Enable or disable optional AI features for this server")
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("True to enable, false to disable")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("timezone")
        .setDescription(
          "Set the default timezone for this server (e.g. UTC, America/New_York, Europe/London)",
        )
        .addStringOption((opt) =>
          opt.setName("tz").setDescription("Timezone string").setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be executed in a Discord server.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      // Enforce server-side permissions
      await requirePermission(guildId, interaction.user.id, "admin");

      // Ensure server record exists
      let server = await db.query.servers.findFirst({
        where: eq(servers.id, guildId),
      });

      if (!server) {
        await db.insert(servers).values({
          id: guildId,
          name: interaction.guild?.name || "Server",
          ownerId: interaction.guild?.ownerId || interaction.user.id,
        });
        server = await db.query.servers.findFirst({
          where: eq(servers.id, guildId),
        });
      }

      if (subcommand === "view") {
        const settings = await db.query.serverSettings.findFirst({
          where: eq(serverSettings.guildId, guildId),
        });

        const embed = createBaseEmbed("⚙️ Server Configuration")
          .setDescription(`Settings and security policies for **${interaction.guild?.name}**:`)
          .addFields(
            {
              name: "Default Channel",
              value: server?.defaultChannelId ? `<#${server.defaultChannelId}>` : "Not configured",
              inline: true,
            },
            { name: "Timezone", value: `\`${server?.timezone || "UTC"}\``, inline: true },
            {
              name: "Secret Scanning",
              value: server?.secretScanningEnabled ? "[✓] Enabled" : "[✕] Disabled",
              inline: true,
            },
            {
              name: "AI Features",
              value: server?.aiEnabled ? "[✓] Enabled" : "[✕] Disabled",
              inline: true,
            },
            {
              name: "Max Monitors Limit",
              value: `\`${settings?.maxMonitors || 10}\``,
              inline: true,
            },
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "set-channel") {
        const channel = interaction.options.getChannel("channel", true);
        await db
          .update(servers)
          .set({ defaultChannelId: channel.id, updatedAt: new Date() })
          .where(eq(servers.id, guildId));

        const embed = createBaseEmbed("✅ Notification Channel Updated")
          .setColor(BrandColors.success)
          .setDescription(`Default notification channel set to <#${channel.id}>.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "toggle-secrets") {
        const enabled = interaction.options.getBoolean("enabled", true);
        await db
          .update(servers)
          .set({ secretScanningEnabled: enabled, updatedAt: new Date() })
          .where(eq(servers.id, guildId));

        const embed = createBaseEmbed("⚙️ Secret Scanner Updated")
          .setColor(BrandColors.success)
          .setDescription(
            `Zero-log secret leak detection has been **${enabled ? "enabled" : "disabled"}**.`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "toggle-ai") {
        const enabled = interaction.options.getBoolean("enabled", true);
        await db
          .update(servers)
          .set({ aiEnabled: enabled, updatedAt: new Date() })
          .where(eq(servers.id, guildId));

        const embed = createBaseEmbed("⚙️ AI Policy Updated")
          .setColor(BrandColors.success)
          .setDescription(
            `AI features have been **${enabled ? "enabled" : "disabled"}** for this server.`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "timezone") {
        const tz = interaction.options.getString("tz", true);
        await db
          .update(servers)
          .set({ timezone: tz, updatedAt: new Date() })
          .where(eq(servers.id, guildId));

        const embed = createBaseEmbed("⚙️ Server Timezone Updated")
          .setColor(BrandColors.success)
          .setDescription(`Server default timezone updated to \`${tz}\`.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
