import { db, users } from "@devpulse/database";
import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const activityCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("activity")
    .setDescription("Developer & Repository Analytics: commits, PRs, reviews, and ASCII histograms")
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Inspect developer contribution volume, reviews, and weekly distribution")
        .addStringOption((opt) =>
          opt
            .setName("username")
            .setDescription("GitHub username (e.g. torvalds)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("repo")
        .setDescription("Inspect 30-day repository commit cadence and PR throughput")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("me")
        .setDescription("View your personal activity telemetry (requires linked GitHub account)"),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "user") {
        const username = interaction.options.getString("username", true);
        const data = await githubClient.getDeveloperActivity(username);

        const maxCount = Math.max(...data.weekdayDistribution.map((d) => d.count), 1);
        const histogram = data.weekdayDistribution
          .map((d) => {
            const barLen = Math.round((d.count / maxCount) * 12);
            const bar = "█".repeat(barLen).padEnd(12, "░");
            return `${d.day} ${bar} ${d.count}`;
          })
          .join("\n");

        const embed = createBaseEmbed(`📈 Developer Activity: @${data.user.login}`)
          .setThumbnail(data.user.avatarUrl)
          .setURL(data.user.htmlUrl)
          .setDescription(
            `**LAST 30 DAYS TELEMETRY**\n\`\`\`text\nCommits:         ${data.commitsCount.toString().padEnd(6)}\nPRs Opened:      ${data.prsOpened.toString().padEnd(6)}\nPRs Merged:      ${data.prsMerged.toString().padEnd(6)}\nReviews:         ${data.reviewsCount.toString().padEnd(6)}\nIssues Resolved: ${data.issuesResolved.toString().padEnd(6)}\n\`\`\`\n**ACTIVITY DISTRIBUTION**\n\`\`\`text\n${histogram}\n\`\`\``,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "repo") {
        const repoInput = interaction.options.getString("repo", true);
        const commits = await githubClient.getCommits(repoInput, 50).catch(() => []);
        const prs = await githubClient.getPullRequests(repoInput, "all", 30).catch(() => []);

        const embed = createBaseEmbed(`📈 Repository Velocity: ${repoInput}`).setDescription(
          `**RECENT COMMIT CADENCE**\n• Recent commits logged: **${commits.length}**\n• Pull Requests active/merged: **${prs.length}**\n• Author velocity: **${new Set(commits.map((c) => c.author.name)).size} active committers**`,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "me") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, interaction.user.id),
        });

        if (!dbUser?.githubUsername) {
          const embed = createBaseEmbed("🔐 GitHub Account Not Linked")
            .setColor(BrandColors.warning)
            .setDescription(
              "Your Discord account is not yet connected to a GitHub username.\n\nUse `/connect github` or `/dev link-github` to link your profile!",
            );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const data = await githubClient.getDeveloperActivity(dbUser.githubUsername);
        const embed = createBaseEmbed(`📈 Personal Activity: @${data.user.login}`)
          .setThumbnail(data.user.avatarUrl)
          .setDescription(
            `**Past 30 Days:**\n• Commits: **${data.commitsCount}**\n• PRs Opened / Merged: **${data.prsOpened}** / **${data.prsMerged}**\n• Code Reviews: **${data.reviewsCount}**\n• Issues Resolved: **${data.issuesResolved}**`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
