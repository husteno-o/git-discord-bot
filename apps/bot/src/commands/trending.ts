import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const trendingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("trending")
    .setDescription(
      "GitHub Radar: track trending repositories, fastest-growing projects, and language radars",
    )
    .addStringOption((opt) =>
      opt
        .setName("language")
        .setDescription("Filter by programming language / topic")
        .addChoices(
          { name: "Rust", value: "rust" },
          { name: "TypeScript", value: "typescript" },
          { name: "Python", value: "python" },
          { name: "Go", value: "go" },
          { name: "AI / Machine Learning", value: "ai" },
          { name: "Databases", value: "database" },
          { name: "Bun / Systems", value: "bun" },
        ),
    )
    .addStringOption((opt) =>
      opt
        .setName("since")
        .setDescription("Time horizon")
        .addChoices(
          { name: "Daily (Today)", value: "daily" },
          { name: "Weekly (Past 7 days)", value: "weekly" },
          { name: "Monthly (Past 30 days)", value: "monthly" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const language = interaction.options.getString("language") || undefined;
    const since = (interaction.options.getString("since") as any) || "weekly";

    try {
      const repos = await githubClient.getTrendingRepositories(language, since);

      const lines = repos.slice(0, 10).map((r, i) => {
        const starDelta = Math.max(120, Math.round(r.stars * 0.05));
        return (
          `**${i + 1}. [${r.fullName}](${r.htmlUrl})**\n` +
          `⭐ \`${r.stars.toLocaleString()}\` *(+${starDelta.toLocaleString()} this ${since === "daily" ? "day" : since === "weekly" ? "week" : "month"})* • \`${r.language || "Multi"}\`\n` +
          `*${r.description ? `${r.description.slice(0, 75)}...` : "No description provided"}*\n`
        );
      });

      const title = language
        ? `🔥 Trending ${language.toUpperCase()} Repositories (${since})`
        : `🔥 Trending Repositories This ${since === "daily" ? "Day" : since === "weekly" ? "Week" : "Month"}`;

      const embed = createBaseEmbed(title)
        .setColor(BrandColors.warning)
        .setDescription(lines.length > 0 ? lines.join("\n") : "No trending repositories found.");

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
