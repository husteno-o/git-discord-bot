import { aiCopilot } from "@devpulse/ai";
import type { GitHubRepo } from "@devpulse/github";
import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { EmbedBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";
import { createAiReviewActionButtons } from "../ui/components.js";
import { createAiReviewEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const codeReviewCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("code-review")
    .setDescription("Comprehensive codebase review for bugs, security & performance")
    .addStringOption((opt) =>
      opt
        .setName("repo")
        .setDescription("Repository format 'owner/repo' (e.g. vercel/next.js)")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("scope")
        .setDescription("Review scope")
        .addChoices(
          { name: "Full Review", value: "full" },
          { name: "Security Only", value: "security" },
          { name: "PR Review", value: "pr" },
          { name: "Architecture", value: "architecture" },
        )
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt.setName("pr").setDescription("Pull request number (required when scope is 'pr')"),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("detailed")
        .setDescription("Include detailed findings with line numbers")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });
    const repoInput = interaction.options.getString("repo", true);
    const scope = (interaction.options.getString("scope") || "full") as
      | "full"
      | "security"
      | "pr"
      | "architecture";
    const prNumber = interaction.options.getInteger("pr");
    interaction.options.getBoolean("detailed") ?? false;

    try {
      const ghRepo = await githubClient.getRepo(repoInput);

      if (scope === "security") {
        await handleSecurityReview(interaction, repoInput, ghRepo);
        return;
      }

      if (scope === "pr" && prNumber) {
        await handlePRReview(interaction, repoInput, prNumber, ghRepo);
        return;
      }

      if (scope === "architecture") {
        await handleArchitectureReview(interaction, repoInput, ghRepo);
        return;
      }

      await handleFullReview(interaction, repoInput, ghRepo);
    } catch (err: unknown) {
      await interaction.editReply({
        embeds: [createErrorEmbed(err instanceof Error ? err : new Error(String(err)))],
      });
    }
  },
};

async function handleFullReview(
  interaction: ChatInputCommandInteraction,
  repoInput: string,
  ghRepo: GitHubRepo,
): Promise<void> {
  const [commits, prs, issues] = await Promise.all([
    githubClient.getCommits(repoInput, 30).catch(() => []),
    githubClient.getPullRequests(repoInput, "all", 30).catch(() => []),
    githubClient.getIssues(repoInput, "all", 30).catch(() => []),
  ]);

  const prsMerged = prs.filter(
    (p: { mergedAt: unknown }) => p.mergedAt !== null && p.mergedAt !== undefined,
  ).length;
  const issuesClosed = issues.filter(
    (i: { closedAt: unknown }) => i.closedAt !== null && i.closedAt !== undefined,
  ).length;
  const healthScore = Math.round(
    Math.min(
      100,
      Math.max(
        60,
        (issues.length > 0 ? Math.round((issuesClosed / issues.length) * 100) : 100) * 0.4 +
          Math.min(commits.length * 1.5, 40) +
          (prsMerged > 0 ? 20 : 10),
      ),
    ),
  );

  const tuiLines = [
    `┌─ [ REPOSITORY TELEMETRY ]──────────────────────────┐`,
    `│  Target : ${repoInput.padEnd(30)}│`,
    `│  Stars  : ${String(ghRepo.stars).padEnd(30)}│`,
    `│  Forks  : ${String(ghRepo.forks).padEnd(30)}│`,
    `│  Issues : ${String(ghRepo.openIssuesCount).padEnd(30)}│`,
    `│  PRs    : ${String(prs.length).padEnd(30)}│`,
    `├─ COMMIT ACTIVITY ───────────────────────────────────┤`,
    `│  30d Commits: ${commits.length.toString().padEnd(24)}│`,
    `│  Merged PRs : ${prsMerged.toString().padEnd(24)}│`,
    `│  Health Score: ${healthScore.toString().padEnd(21)}│`,
    `└─────────────────────────────────────────────────────┘`,
  ];

  const embed = new EmbedBuilder()
    .setColor(healthScore >= 80 ? 0xa6da95 : healthScore >= 50 ? 0xeed49f : 0xed8796)
    .setTitle(`${NF.search} Code Review: ${repoInput}`)
    .setDescription(tuiLines.join("\n"))
    .setFooter({ text: "DevPulse Code Review Engine", iconURL: ghRepo.owner.avatarUrl });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSecurityReview(
  interaction: ChatInputCommandInteraction,
  repoInput: string,
  ghRepo: GitHubRepo,
): Promise<void> {
  const advisories = await githubClient.getSecurityAdvisories(repoInput).catch(() => []);
  const deps = await githubClient.getDependencies(repoInput).catch(() => null);

  const critical = advisories.filter((a: { severity: string }) => a.severity === "critical").length;
  const high = advisories.filter((a: { severity: string }) => a.severity === "high").length;
  const medium = advisories.filter((a: { severity: string }) => a.severity === "medium").length;
  const low = advisories.filter((a: { severity: string }) => a.severity === "low").length;
  const securityScore = Math.max(0, 100 - critical * 20 - high * 10 - medium * 5);

  const depsLine = deps
    ? `\n**Dependencies:** ${deps.totalCount} packages, ${deps.outdatedCount} outdated`
    : "";

  const tui = [
    `┌─ [ SECURITY AUDIT ]────────────────────────────────┐`,
    `│  Repository: ${repoInput.padEnd(27)}│`,
    `├─ VULNERABILITY BREAKDOWN ───────────────────────────┤`,
    `│  🔴 Critical: ${String(critical).padEnd(24)}│`,
    `│  🟠 High    : ${String(high).padEnd(24)}│`,
    `│  🟡 Medium  : ${String(medium).padEnd(24)}│`,
    `│  🔵 Low     : ${String(low).padEnd(24)}│`,
    `├─ SECURITY SCORE ────────────────────────────────────┤`,
    `${`│  ${renderMeter(securityScore)} ${securityScore}/100`.padEnd(43)}│`,
    `${depsLine}`,
    `└─────────────────────────────────────────────────────┘`,
  ];

  const embed = new EmbedBuilder()
    .setColor(critical > 0 ? 0xed8796 : high > 0 ? 0xf5a97f : 0xa6da95)
    .setTitle(`${NF.shield} Security Review: ${repoInput}`)
    .setDescription(tui.join("\n"))
    .setFooter({ text: "DevPulse Security Scanner", iconURL: ghRepo.owner.avatarUrl });

  await interaction.editReply({ embeds: [embed] });
}

async function handlePRReview(
  interaction: ChatInputCommandInteraction,
  repoInput: string,
  prNumber: number,
  ghRepo: GitHubRepo,
): Promise<void> {
  const pr = await githubClient.getPullRequest(repoInput, prNumber);
  const files = await githubClient.getPullRequestFiles(repoInput, prNumber);
  const review = await aiCopilot.reviewPullRequest(repoInput, pr, files);

  const embed = createAiReviewEmbed(ghRepo, pr, review);
  const components = createAiReviewActionButtons(
    pr.author.login || "",
    repoInput.split("/")[1] || "",
    pr.number,
    pr.htmlUrl,
    review.approvedForMerge,
  );

  await interaction.editReply({ embeds: [embed], components });
}

async function handleArchitectureReview(
  interaction: ChatInputCommandInteraction,
  repoInput: string,
  ghRepo: GitHubRepo,
): Promise<void> {
  const commits = await githubClient.getCommits(repoInput, 50).catch(() => []);
  const contributors = await githubClient.getContributors(repoInput, 15).catch(() => []);

  const authors = new Set(commits.map((c: { author: { name: string } }) => c.author.name));
  const commitDays = new Set(
    commits.map((c: { author: { date: string } }) => c.author.date.split("T")[0]),
  );
  const commitFrequency = commits.length / Math.max(commitDays.size, 1);

  const tui = [
    `┌─ [ ARCHITECTURE ANALYSIS ]─────────────────────────┐`,
    `│  Repository   : ${repoInput.padEnd(26)}│`,
    `├─ CONTRIBUTOR METRICS ───────────────────────────────┤`,
    `│  Authors      : ${String(authors.size).padEnd(26)}│`,
    `│  Contributors : ${String(contributors.length).padEnd(26)}│`,
    `│  Avg Commits/d: ${commitFrequency.toFixed(1).padEnd(24)}│`,
    `├─ CODE HEALTH ───────────────────────────────────────┤`,
    `│  Stars        : ${String(ghRepo.stars).padEnd(26)}│`,
    `│  Forks        : ${String(ghRepo.forks).padEnd(26)}│`,
    `│  Language     : ${((ghRepo.language || "N/A") as string).padEnd(26)}│`,
    `└─────────────────────────────────────────────────────┘`,
  ];

  const embed = new EmbedBuilder()
    .setColor(0xc6a0f6)
    .setTitle(`${NF.terminal} Architecture Review: ${repoInput}`)
    .setDescription(tui.join("\n"))
    .setFooter({ text: "DevPulse Architecture Analyzer", iconURL: ghRepo.owner.avatarUrl });

  await interaction.editReply({ embeds: [embed] });
}

function renderMeter(percentage: number, length = 10): string {
  const filled = Math.min(length, Math.max(0, Math.round((percentage / 100) * length)));
  const color = percentage >= 80 ? "🟢" : percentage >= 50 ? "🟡" : "🔴";
  return `${color} ${"█".repeat(filled)}${"░".repeat(length - filled)} ${percentage.toFixed(0)}%`;
}
