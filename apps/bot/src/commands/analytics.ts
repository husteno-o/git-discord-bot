import { analyticsService } from "@devpulse/analytics";
import { SlashCommandBuilder } from "discord.js";
import {
  createErrorEmbed,
  createPersonalDashboardEmbed,
  createTeamDashboardEmbed,
} from "../ui/embeds.js";
import type { Command } from "./types.js";

export const analyticsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("analytics")
    .setDescription("Deep developer productivity analytics and cycle time metrics")
    .addSubcommand((sub) =>
      sub
        .setName("personal")
        .setDescription(
          "View your personal productivity telemetry, focus distribution, and cycle time",
        )
        .addIntegerOption((opt) =>
          opt
            .setName("days")
            .setDescription("Analysis window (default: 7 days)")
            .addChoices(
              { name: "7 Days", value: 7 },
              { name: "14 Days", value: 14 },
              { name: "30 Days", value: 30 },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("team")
        .setDescription("View team throughput, merged PR velocity, and repository health")
        .addIntegerOption((opt) =>
          opt
            .setName("days")
            .setDescription("Analysis window (default: 7 days)")
            .addChoices(
              { name: "7 Days", value: 7 },
              { name: "14 Days", value: 14 },
              { name: "30 Days", value: 30 },
            ),
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
    const days = interaction.options.getInteger("days") || 7;

    try {
      if (subcommand === "personal") {
        const stats = await analyticsService.getPersonalDashboard(interaction.user.id, days);
        const embed = createPersonalDashboardEmbed(stats);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "team") {
        const teamStats = await analyticsService.getTeamDashboard(guildId, days);
        const embed = createTeamDashboardEmbed(teamStats);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
