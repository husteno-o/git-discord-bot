import { computeRepoDashboardMetrics, githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createRepoNavButtons } from "../ui/components.js";
import {
  createErrorEmbed,
  createRepoCommitsEmbed,
  createRepoDashboardEmbed,
  createRepoIssuesEmbed,
  createRepoPrsEmbed,
  createRepoReleasesEmbed,
} from "../ui/embeds.js";
import type { Command } from "./types.js";

export const githubCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("github")
    .setDescription("GitHub intelligence, repository analytics, and developer tracking")
    .addSubcommand((sub) =>
      sub
        .setName("repo")
        .setDescription("View full repository dashboard (overview, activity, focus, cycle time)")
        .addStringOption((opt) =>
          opt
            .setName("repository")
            .setDescription("Target GitHub repository (e.g. vercel/next.js, oven-sh/bun)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("commits")
        .setDescription("View recent commits")
        .addStringOption((opt) =>
          opt
            .setName("repository")
            .setDescription("Target GitHub repository (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("prs")
        .setDescription("View active and recent pull requests")
        .addStringOption((opt) =>
          opt
            .setName("repository")
            .setDescription("Target GitHub repository (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("issues")
        .setDescription("View open issues and bug tracking")
        .addStringOption((opt) =>
          opt
            .setName("repository")
            .setDescription("Target GitHub repository (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("releases")
        .setDescription("View published releases and version tags")
        .addStringOption((opt) =>
          opt
            .setName("repository")
            .setDescription("Target GitHub repository (e.g. vercel/next.js)")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repository", true);

    try {
      const repo = await githubClient.getRepo(repoInput);

      if (subcommand === "repo") {
        const [commits, prs, issues, releases] = await Promise.all([
          githubClient.getCommits(repoInput, 30).catch(() => []),
          githubClient.getPullRequests(repoInput, "all", 30).catch(() => []),
          githubClient.getIssues(repoInput, "all", 30).catch(() => []),
          githubClient.getReleases(repoInput, 10).catch(() => []),
        ]);

        const metrics = computeRepoDashboardMetrics(commits, prs, issues, releases);
        const embed = createRepoDashboardEmbed(repo, metrics, "overview");
        const components = createRepoNavButtons(repo.owner.login, repo.name, "overview");

        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "commits") {
        const commits = await githubClient.getCommits(repoInput, 15);
        const embed = createRepoCommitsEmbed(repo, commits);
        const components = createRepoNavButtons(repo.owner.login, repo.name, "commits");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "prs") {
        const prs = await githubClient.getPullRequests(repoInput, "all", 15);
        const embed = createRepoPrsEmbed(repo, prs);
        const components = createRepoNavButtons(repo.owner.login, repo.name, "prs");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "issues") {
        const issues = await githubClient.getIssues(repoInput, "all", 15);
        const embed = createRepoIssuesEmbed(repo, issues);
        const components = createRepoNavButtons(repo.owner.login, repo.name, "issues");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "releases") {
        const releases = await githubClient.getReleases(repoInput, 10);
        const embed = createRepoReleasesEmbed(repo, releases);
        const components = createRepoNavButtons(repo.owner.login, repo.name, "releases");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
