import { monitoringService } from "@devpulse/monitoring";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed, createMonitorStatusEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const monitorCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("monitor")
    .setDescription("Website uptime, HTTP status, and SSL expiration monitoring")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add website or API endpoint to monitor")
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Target website URL").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Custom monitor display name").setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("interval")
            .setDescription("Interval in seconds (default: 60s)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all website monitors configured in this server"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View detailed uptime and latency history for a monitor")
        .addStringOption((opt) => opt.setName("id").setDescription("Monitor ID").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a website monitor")
        .addStringOption((opt) => opt.setName("id").setDescription("Monitor ID").setRequired(true)),
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
      if (subcommand === "add") {
        const url = interaction.options.getString("url", true);
        const name = interaction.options.getString("name") || undefined;
        const interval = interaction.options.getInteger("interval") || 60;

        const monitor = await monitoringService.addMonitor(guildId, {
          url,
          name,
          intervalSeconds: interval,
        });

        const embed = createBaseEmbed("✅ Monitor Created")
          .setColor(BrandColors.success)
          .setDescription(
            `Successfully created monitor **${monitor.name}** (\`${monitor.url}\`).\n\n` +
              `**Monitor ID:** \`${monitor.id}\`\n` +
              `**Initial Ping Status:** ${monitor.initialCheck.isHealthy ? "🟢 UP (Healthy)" : "🔴 DOWN"}\n` +
              `**Response Time:** \`${monitor.initialCheck.responseTimeMs}ms\``,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "list") {
        const monitors = await monitoringService.listMonitors(guildId);

        if (monitors.length === 0) {
          const embed = createBaseEmbed("📡 Website Monitors").setDescription(
            "No monitors configured yet. Add your first endpoint with `/monitor add <url>`.",
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const embed = createBaseEmbed(`📡 Configured Monitors (${monitors.length})`).setDescription(
          "Current health and latency of monitored web applications:",
        );

        for (const m of monitors) {
          const statusIcon = m.isHealthy ? "🟢" : "🔴";
          const latency = m.lastResponseTimeMs ? `${m.lastResponseTimeMs}ms` : "N/A";
          embed.addFields({
            name: `${statusIcon} ${m.name} (\`${m.id.slice(0, 8)}\`)`,
            value: `• **URL:** \`${m.url}\`\n• **Status:** \`${m.lastStatus ?? "N/A"}\` (${latency})\n• **Interval:** \`${m.intervalSeconds}s\``,
            inline: false,
          });
        }

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "status") {
        const id = interaction.options.getString("id", true);
        const { monitor, history } = await monitoringService.getMonitorStatus(guildId, id);
        const embed = createMonitorStatusEmbed(monitor, history);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "remove") {
        const id = interaction.options.getString("id", true);
        await monitoringService.removeMonitor(guildId, id);

        const embed = createBaseEmbed("🗑️ Monitor Removed")
          .setColor(BrandColors.success)
          .setDescription(`Successfully deleted monitor with ID \`${id}\`.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
