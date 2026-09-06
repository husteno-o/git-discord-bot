import { computeRepoDashboardMetrics, githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { withProgressAnimation } from "../ui/animation.js";
import { createRepoNavButtons } from "../ui/components.js";
import {
  createDependenciesEmbed,
  createErrorEmbed,
  createRepoDashboardEmbed,
  createRepoGrowthEmbed,
  createRepoHealthEmbed,
} from "../ui/embeds.js";
import type { Command } from "./types.js";

export const repoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("repo")
    .setDescription("Repository Intelligence, health scores, dependencies, and growth metrics")
    .addStringOption((opt) =>
      opt
        .setName("repository")
        .setDescription(
          "Repository format 'owner/repo' (e.g. vercel/next.js, swadhinbiswas/warren)",
        )
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("view")
        .setDescription("View to display (default: Overview Dashboard)")
        .addChoices(
          { name: "Overview Dashboard", value: "overview" },
          { name: "Health Score", value: "health" },
          { name: "Dependencies", value: "dependencies" },
          { name: "Growth & Velocity", value: "growth" },
        )
        .setRequired(false),
    ),

  async execute(interaction) {
    const repoInput = interaction.options.getString("repository", true);
    const view = interaction.options.getString("view") || "overview";

    await withProgressAnimation(
      interaction,
      [`Fetching telemetry for ${repoInput}...`, `Analyzing commit velocity and pull requests...`],
      async () => {
        try {
          const { owner, repo } = githubClient.parseRepoInput(repoInput);

          if (view === "health") {
            const ghRepo = await githubClient.getRepo(repoInput);
            const health = await githubClient.getHealthScore(repoInput);
            const embed = createRepoHealthEmbed(ghRepo, health);
            const components = createRepoNavButtons(owner, repo, "health");
            await interaction.editReply({ content: "", embeds: [embed], components });
            return;
          }

          if (view === "dependencies") {
            const ghRepo = await githubClient.getRepo(repoInput);
            const deps = await githubClient.getDependencies(repoInput);
            const embed = createDependenciesEmbed(ghRepo, deps);
            const components = createRepoNavButtons(owner, repo, "dependencies");
            await interaction.editReply({ content: "", embeds: [embed], components });
            return;
          }

          if (view === "growth") {
            const ghRepo = await githubClient.getRepo(repoInput);
            const growth = await githubClient.getGrowth(repoInput);
            const embed = createRepoGrowthEmbed(ghRepo, growth);
            const components = createRepoNavButtons(owner, repo, "growth");
            await interaction.editReply({ content: "", embeds: [embed], components });
            return;
          }

          // Default: Overview Dashboard
          const ghRepo = await githubClient.getRepo(repoInput);
          const [commits, prs, issues, releases] = await Promise.all([
            githubClient.getCommits(repoInput, 30).catch(() => []),
            githubClient.getPullRequests(repoInput, "all", 30).catch(() => []),
            githubClient.getIssues(repoInput, "all", 30).catch(() => []),
            githubClient.getReleases(repoInput, 10).catch(() => []),
          ]);

          const metrics = computeRepoDashboardMetrics(commits, prs, issues, releases);
          const embed = createRepoDashboardEmbed(ghRepo, metrics, "overview");
          const components = createRepoNavButtons(owner, repo, "overview");

          await interaction.editReply({ content: "", embeds: [embed], components });
        } catch (err: any) {
          await interaction.editReply({ content: "", embeds: [createErrorEmbed(err)] });
        }
      },
    );
  },
};
