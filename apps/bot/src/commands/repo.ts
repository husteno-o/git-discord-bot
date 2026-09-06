import { computeRepoDashboardMetrics, githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
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
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View master repository intelligence dashboard")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Repository format 'owner/repo' (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("health")
        .setDescription("Calculate comprehensive repository health score (0-100)")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Repository format 'owner/repo' (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("dependencies")
        .setDescription("Inspect repository dependency graph and manifests")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Repository format 'owner/repo' (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("growth")
        .setDescription("Track 30-day repository growth and velocity")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Repository format 'owner/repo' (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("name", true);

    try {
      const { owner, repo } = githubClient.parseRepoInput(repoInput);

      if (subcommand === "view") {
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

        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "health") {
        const ghRepo = await githubClient.getRepo(repoInput);
        const health = await githubClient.getHealthScore(repoInput);
        const embed = createRepoHealthEmbed(ghRepo, health);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "dependencies") {
        const ghRepo = await githubClient.getRepo(repoInput);
        const deps = await githubClient.getDependencies(repoInput);
        const embed = createDependenciesEmbed(ghRepo, deps);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "growth") {
        const ghRepo = await githubClient.getRepo(repoInput);
        const growth = await githubClient.getGrowth(repoInput);
        const embed = createRepoGrowthEmbed(ghRepo, growth);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
