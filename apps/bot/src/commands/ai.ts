import { aiCopilot } from "@devpulse/ai";
import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createAiBugfixActionButtons, createAiReviewActionButtons } from "../ui/components.js";
import {
  createAiBugfixEmbed,
  createAiExplainEmbed,
  createAiReviewEmbed,
  createAiSummaryEmbed,
  createErrorEmbed,
} from "../ui/embeds.js";
import type { Command } from "./types.js";

export const aiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription(
      "AI Code Copilot & Reviewer: automated PR reviews, standup summaries, bugfixes & explain",
    )
    .addSubcommand((sub) =>
      sub
        .setName("review")
        .setDescription(
          "Perform automated code review on a pull request (security, bugs, diff fixes)",
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("pr").setDescription("Pull request number").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("summarize")
        .setDescription("Generate executive changelog and standup summaries of shipped code")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("timeframe")
            .setDescription("Timeframe for standup summary")
            .addChoices(
              { name: "Week (Past 7 Days)", value: "week" },
              { name: "Month (Past 30 Days)", value: "month" },
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("bugfix")
        .setDescription(
          "Ingest issue description & stack traces, identify culprit, and synthesize patch",
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("issue").setDescription("Issue number").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("explain")
        .setDescription(
          "Explain algorithms, system architecture, dependencies & complexity of a file",
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("file")
            .setDescription("Path to the file inside repository (e.g. src/auth/token.ts)")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("line")
            .setDescription("Optional specific line number to focus on")
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);

    try {
      if (subcommand === "review") {
        const prNumber = interaction.options.getInteger("pr", true);
        const [repo, pr, files] = await Promise.all([
          githubClient.getRepo(repoInput),
          githubClient.getPullRequest(repoInput, prNumber),
          githubClient.getPullRequestFiles(repoInput, prNumber),
        ]);

        const review = await aiCopilot.reviewPullRequest(repo.fullName, pr, files);
        const embed = createAiReviewEmbed(repo, pr, review);
        const components = createAiReviewActionButtons(
          repo.owner.login,
          repo.name,
          pr.number,
          pr.htmlUrl,
          review.approvedForMerge,
        );

        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "summarize") {
        const timeframe = (interaction.options.getString("timeframe") || "week") as
          | "week"
          | "month";
        const repo = await githubClient.getRepo(repoInput);

        const days = timeframe === "week" ? 7 : 30;
        const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const [commits, prs] = await Promise.all([
          githubClient.getCommits(repoInput, 50),
          githubClient.getPullRequests(repoInput, "closed", 30),
        ]);

        // Filter commits and PRs within timeframe
        const filteredCommits = commits.filter(
          (c) => new Date(c.author.date).getTime() >= new Date(sinceDate).getTime(),
        );
        const targetCommits = filteredCommits.length > 0 ? filteredCommits : commits.slice(0, 15);

        const filteredPrs = prs.filter(
          (p) =>
            p.state === "closed" &&
            new Date(p.updatedAt).getTime() >= new Date(sinceDate).getTime(),
        );
        const targetPrs = filteredPrs.length > 0 ? filteredPrs : prs.slice(0, 10);

        const summary = await aiCopilot.summarizeActivity(
          repo,
          targetCommits,
          targetPrs,
          timeframe,
        );
        const embed = createAiSummaryEmbed(repo, summary);

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "bugfix") {
        const issueNumber = interaction.options.getInteger("issue", true);
        const [repo, issue] = await Promise.all([
          githubClient.getRepo(repoInput),
          githubClient.getSingleIssue(repoInput, issueNumber),
        ]);

        const bugfix = await aiCopilot.suggestBugfix(repo.fullName, issue);
        const embed = createAiBugfixEmbed(repo, issue, bugfix);
        const components = createAiBugfixActionButtons(
          repo.owner.login,
          repo.name,
          issue.number,
          issue.htmlUrl,
        );

        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (subcommand === "explain") {
        const filePath = interaction.options.getString("file", true);
        const line = interaction.options.getInteger("line") || undefined;

        const [repo, file] = await Promise.all([
          githubClient.getRepo(repoInput),
          githubClient.getFileContents(repoInput, filePath),
        ]);

        const explanation = await aiCopilot.explainCode(
          repo.fullName,
          file.path,
          file.content,
          line,
        );
        const embed = createAiExplainEmbed(repo, file, explanation, line);

        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: unknown) {
      await interaction.editReply({
        embeds: [createErrorEmbed(err instanceof Error ? err : new Error(String(err)))],
      });
    }
  },
};
