import { analyticsService } from "@devpulse/analytics";
import { db, standups, users } from "@devpulse/database";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const teamCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("Engineering team workflows, daily standups, and activity rollups")
    .addSubcommand((sub) =>
      sub
        .setName("standup")
        .setDescription(
          "Record and post your daily engineering standup with automatic GitHub telemetry",
        )
        .addStringOption((opt) =>
          opt.setName("today").setDescription("What you plan to work on today").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("blockers").setDescription("Any blockers or dependencies").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("activity")
        .setDescription("View team-wide aggregated velocity and repository throughput"),
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
      if (subcommand === "standup") {
        const todayPlan = interaction.options.getString("today", true);
        const blockers = interaction.options.getString("blockers") || "None";

        // Query user's recent activity (yesterday)
        const stats = await analyticsService
          .getPersonalDashboard(interaction.user.id, 1)
          .catch(() => null);

        const yesterdayItems: string[] = [];
        if (
          stats &&
          (stats.activity.commits > 0 || stats.activity.prsOpened > 0 || stats.activity.reviews > 0)
        ) {
          if (stats.activity.commits > 0)
            yesterdayItems.push(`${stats.activity.commits} commits pushed`);
          if (stats.activity.prsOpened > 0)
            yesterdayItems.push(`${stats.activity.prsOpened} pull requests opened`);
          if (stats.activity.reviews > 0)
            yesterdayItems.push(`${stats.activity.reviews} PR reviews completed`);
        } else {
          yesterdayItems.push("No recorded GitHub activity in connected repos");
        }

        const todayDate = new Date().toISOString().split("T")[0];

        // Ensure user exists in users table
        await db
          .insert(users)
          .values({
            id: interaction.user.id,
            username: interaction.user.username,
            avatarUrl: interaction.user.displayAvatarURL(),
          })
          .onConflictDoNothing();

        // Upsert standup
        await db
          .insert(standups)
          .values({
            id: crypto.randomUUID(),
            guildId,
            userId: interaction.user.id,
            date: todayDate,
            yesterdayActivity: yesterdayItems,
            todayPlan,
            blockers,
          })
          .onConflictDoNothing();

        const embed = createBaseEmbed(`📋 Daily Standup — ${interaction.user.username}`)
          .setColor(BrandColors.primary)
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            {
              name: "⏮️ Yesterday (Observed GitHub Telemetry)",
              value: yesterdayItems.map((item) => `• ${item}`).join("\n"),
              inline: false,
            },
            {
              name: "▶️ Today's Plan",
              value: todayPlan,
              inline: false,
            },
            {
              name: "🛑 Blockers",
              value: blockers,
              inline: false,
            },
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "activity") {
        const teamStats = await analyticsService.getTeamDashboard(guildId, 7);
        const embed = createBaseEmbed("👥 Team Activity Rollup")
          .setColor(BrandColors.primary)
          .addFields(
            { name: "Repositories Monitored", value: `\`${teamStats.repoCount}\``, inline: true },
            {
              name: "Active Contributors",
              value: `\`${teamStats.activeContributors}\``,
              inline: true,
            },
            { name: "Commits (7d)", value: `\`${teamStats.totalCommits}\``, inline: true },
            { name: "PRs Merged (7d)", value: `\`${teamStats.mergedPrs}\``, inline: true },
            { name: "Issues Resolved", value: `\`${teamStats.closedIssues}\``, inline: true },
            { name: "Avg Time to Merge", value: `\`${teamStats.avgTimeToMerge}\``, inline: true },
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
