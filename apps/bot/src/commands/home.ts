import { db, users } from "@devpulse/database";
import { SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { createHomeNavButtons } from "../ui/components.js";
import { createErrorEmbed, createHomeDashboardEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const homeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("home")
    .setDescription(
      "Daily Developer Command Center: personal activity, bottlenecks, releases, and radar",
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, interaction.user.id),
      });

      const username = dbUser?.githubUsername || interaction.user.username;

      const userStats = {
        commits: 14,
        prs: 5,
        reviews: 9,
        issues: 3,
      };

      const attentionItems = [
        "• PR #481 (`feat/oauth`) → ⚠️ Waiting for your review (18h)",
        "• PR #492 (`fix/db-pool`) → ❌ CI failing on integration tests",
      ];

      const latestReleases = [
        "• **RavenDev / DevPulse v1.4.0** released 2h ago — Faster startup, clean GitHub engine",
      ];

      const trendingRepos = [
        "• **astral-sh/uv** (+2,410 ⭐ this week)",
        "• **oven-sh/bun** (+1,890 ⭐ this week)",
      ];

      const embed = createHomeDashboardEmbed(
        username,
        userStats,
        attentionItems,
        latestReleases,
        trendingRepos,
      );

      const components = createHomeNavButtons();
      await interaction.editReply({ embeds: [embed], components });
    } catch (err: unknown) {
      await interaction.editReply({
        embeds: [createErrorEmbed(err instanceof Error ? err : new Error(String(err)))],
      });
    }
  },
};
