import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { renderHorizontalBarChart, renderStackedBar } from "@devpulse/core";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const teamCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("GitHub Team Intelligence: activity, workload balance, and cycle times")
    .addSubcommand((sub) =>
      sub
        .setName("dashboard")
        .setDescription("View team activity, review throughput, and PR cycle times")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Target repository (optional)"),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a Discord server.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const repoInput = interaction.options.getString("repo") || "swadhin/discordbot";

    try {
      const [ghRepo, commits, contributors, prs, issues] = await Promise.all([
        githubClient.getRepo(repoInput).catch(() => null),
        githubClient.getCommits(repoInput, 50).catch(() => []),
        githubClient.getContributors(repoInput, 15).catch(() => []),
        githubClient.getPullRequests(repoInput, "all", 30).catch(() => []),
        githubClient.getIssues(repoInput, "all", 30).catch(() => []),
      ]);

      const authors = new Set(commits.map((c: { author: { name: string } }) => c.author.name));
      const commitDays = new Set(
        commits.map((c: { author: { date: string } }) => c.author.date.split("T")[0]),
      );
      const commitFrequency = commits.length / Math.max(commitDays.size, 1);

      const prsOpen = prs.filter((p: { state: string }) => p.state === "open").length;
      const prsMerged = prs.filter(
        (p: { mergedAt: unknown }) => p.mergedAt !== null && p.mergedAt !== undefined,
      ).length;
      const issuesOpen = issues.filter((i: { state: string }) => i.state === "open").length;

      // Real commit activity by day of week
      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayCommits = [0, 0, 0, 0, 0, 0, 0];
      for (const c of commits) {
        const day = new Date(c.author.date).getDay();
        dayCommits[day]++;
      }
      const commitChart = renderHorizontalBarChart(
        dayLabels.map((d, i) => ({ label: d, value: dayCommits[i] })),
        { maxBarLength: 8, showValues: true },
      );

      // Real contributor activity
      const topContributors = contributors.slice(0, 6).map(
        (c: { login: string; contributions: number }) => ({
          label: c.login.slice(0, 8),
          value: c.contributions,
        }),
      );
      const contributorChart =
        topContributors.length > 0
          ? renderHorizontalBarChart(topContributors, { maxBarLength: 10, showValues: true })
          : "No contributor data";

      // Real velocity stacked bar
      const velocityBar = renderStackedBar("Activity", [
        { value: prsMerged },
        { value: prsOpen },
        { value: issuesOpen },
      ], 15);

      // Bus factor assessment
      let busFactor: string;
      if (authors.size <= 1) {
        busFactor = "🔴 Critical (1 dev)";
      } else if (authors.size <= 2) {
        busFactor = "🟠 Risky (2 devs)";
      } else if (authors.size <= 5) {
        busFactor = "🟡 Moderate";
      } else {
        busFactor = "🟢 Distributed";
      }

      const avatarUrl = ghRepo?.owner?.avatarUrl || "https://github.com/github.png";

      const tui = [
        `\`\`\`ansi`,
        `\x1b[1;35m┌─ [ TEAM INTELLIGENCE ]────────────────────────────┐\x1b[0m`,
        `\x1b[2;37m│\x1b[0m \x1b[2;37mRepo  :\x1b[0m \x1b[1m${repoInput.slice(0, 30).padEnd(30)}\x1b[0m \x1b[2;37m│\x1b[0m`,
        `\x1b[2;37m│\x1b[0m \x1b[2;37mStack :\x1b[0m \x1b[1;35m${(ghRepo?.language || "Unknown").padEnd(12)}\x1b[0m \x1b[2;37mBranch:\x1b[0m \x1b[1;34m${(ghRepo?.defaultBranch || "main").slice(0, 10)}\x1b[0m \x1b[2;37m│\x1b[0m`,
        `\x1b[1;35m├─ TEAM METRICS ────────────────────────────────────┤\x1b[0m`,
        `\x1b[2;37m│\x1b[0m \x1b[2;37mDevs  \x1b[0m \x1b[1;36m${String(authors.size).padStart(4)}\x1b[0m  \x1b[2;37mContributors\x1b[0m \x1b[1;35m${String(contributors.length).padStart(4)}\x1b[0m  \x1b[2;37mFreq/d\x1b[0m \x1b[1;33m${commitFrequency.toFixed(1).padStart(5)}\x1b[0m \x1b[2;37m│\x1b[0m`,
        `\x1b[2;37m│\x1b[0m \x1b[2;37mStars\x1b[0m \x1b[1;33m${(ghRepo?.stars || 0).toLocaleString().padStart(7)} \x1b[0m \x1b[2;37mForks\x1b[0m \x1b[1;35m${(ghRepo?.forks || 0).toLocaleString().padStart(6)}\x1b[0m  \x1b[2;37mBus:\x1b[0m \x1b[1m${busFactor.replace(/\s+/g, " ")}\x1b[0m \x1b[2;37m│\x1b[0m`,
        `\x1b[1;35m└──────────────────────────────────────────────────┘\x1b[0m`,
        `\`\`\``,
      ];

      const embed = createBaseEmbed(`${NF.users} Team Intelligence: ${interaction.guild?.name || "Team"}`)
        .setColor(BrandColors.primary)
        .setDescription(tui.join("\n"))
        .addFields(
          {
            name: `${NF.sparkle} Commits by Day`,
            value: `\`\`\`\n${commitChart}\n\`\`\``,
            inline: false,
          },
          {
            name: `${NF.users} Top Contributors`,
            value: `\`\`\`\n${contributorChart}\n\`\`\``,
            inline: false,
          },
          {
            name: `${NF.speedometer} Velocity`,
            value: `\`\`\`\n${velocityBar}\n\`\`\``,
            inline: true,
          },
          {
            name: `${NF.chart} Team Insights`,
            value:
              `• **PR Merge Rate:** ${prs.length > 0 ? Math.round((prsMerged / prs.length) * 100) : 0}%\n` +
              `• **PRs Open:** ${prsOpen}\n` +
              `• **Issues Open:** ${issuesOpen}\n` +
              `• **Commit Cadence:** ${commitFrequency >= 2 ? "Daily+" : commitFrequency >= 0.5 ? "Weekly" : "Sporadic"}\n` +
              `• **Bus Factor:** ${busFactor}`,
            inline: true,
          },
        )
        .setFooter({
          text: "GITBOT Team Intelligence v2 • Powered by DevPulse",
          iconURL: avatarUrl,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: unknown) {
      await interaction.editReply({
        embeds: [createErrorEmbed(err instanceof Error ? err : new Error(String(err)))],
      });
    }
  },
};