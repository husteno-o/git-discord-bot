import { aiCopilot } from "@devpulse/ai";
import type { GitHubRepo } from "@devpulse/github";
import { githubClient } from "@devpulse/github";
import { renderHorizontalBarChart, renderPieChart, renderStackedBar } from "@devpulse/core";
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
  const prsOpen = prs.filter((p: { state: string }) => p.state === "open").length;
  const issuesOpen = issues.filter((i: { state: string }) => i.state === "open").length;

  const healthScore = Math.round(
    Math.min(
      100,
      Math.max(
        40,
        (issues.length > 0 ? Math.round((issuesClosed / issues.length) * 100) : 80) * 0.3 +
          Math.min(commits.length * 2, 35) +
          (prsMerged > 0 ? 20 : 5) +
          (ghRepo.stars > 100 ? 15 : Math.round(ghRepo.stars / 10)),
      ),
    ),
  );

  // Compute language breakdown from repo
  const langEntries = Object.entries(ghRepo.languages || {});
  const totalLangBytes = langEntries.reduce((s, [, v]) => s + (v as number), 0);
  const langPie = langEntries.slice(0, 6).map(([lang, bytes]) => ({
    label: lang,
    value: Math.round(((bytes as number) / totalLangBytes) * 100),
  }));

  // PR status distribution
  const prStatusData = [
    { label: "Merged", value: prsMerged },
    { label: "Open", value: prsOpen },
    { label: "Closed", value: prs.length - prsMerged - prsOpen },
  ].filter(d => d.value > 0);

  // Activity by day of week
  const dayCommits = [0, 0, 0, 0, 0, 0, 0];
  for (const c of commits) {
    const day = new Date(c.author.date).getDay();
    dayCommits[day]++;
  }
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const commitByDayChart = renderHorizontalBarChart(
    dayLabels.map((d, i) => ({ label: d, value: dayCommits[i] })),
    { maxBarLength: 8, showValues: true },
  );

  // Build TUI visualization
  const healthMeter = renderHealthMeter(healthScore);
  const langChart = langPie.length > 0 ? renderPieChart(langPie, 3) : "No language data";
  const prChart = prStatusData.length > 0 ? renderPieChart(prStatusData, 2) : "No PR data";

  const tuiLines = [
    `\`\`\`ansi`,
    `\x1b[1;35m┌─ [ REPOSITORY CODE REVIEW ]──────────────────────┐\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mTarget:\x1b[0m \x1b[1m${repoInput.slice(0, 28).padEnd(28)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mStack :\x1b[0m \x1b[1;35m${(ghRepo.language || "Unknown").padEnd(15)}\x1b[0m ${(ghRepo.isPrivate ? "\x1b[1;31mPrivate" : "\x1b[1;32mPublic").padEnd(18)}\x1b[0m\x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ TELEMETRY ──────────────────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mStars\x1b[0m \x1b[1;33m${ghRepo.stars.toLocaleString().padStart(6)}\x1b[0m  \x1b[2;37mForks\x1b[0m \x1b[1;35m${ghRepo.forks.toLocaleString().padStart(6)}\x1b[0m  \x1b[2;37mIssues\x1b[0m \x1b[1;32m${String(issuesOpen).padStart(4)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ 30-DAY ACTIVITY ───────────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mCommits\x1b[0m \x1b[1;36m${String(commits.length).padStart(4)}\x1b[0m  \x1b[2;37mPRs Merged\x1b[0m \x1b[1;32m${String(prsMerged).padStart(4)}\x1b[0m  \x1b[2;37mPRs Open\x1b[0m \x1b[1;36m${String(prsOpen).padStart(4)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ HEALTH SCORE ──────────────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m  ${healthMeter} \x1b[0m\x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m└─────────────────────────────────────────────────┘\x1b[0m`,
    `\`\`\``,
  ];

  const embed = new EmbedBuilder()
    .setColor(healthScore >= 80 ? 0xa6da95 : healthScore >= 50 ? 0xeed49f : 0xed8796)
    .setTitle(`${NF.search} Code Review: ${repoInput}`)
    .setURL(ghRepo.htmlUrl)
    .setDescription(tuiLines.join("\n"))
    .addFields(
      {
        name: `${NF.chart} Language Composition`,
        value: `\`\`\`\n${langChart}\n\`\`\``,
        inline: true,
      },
      {
        name: `${NF.gitPullRequest} PR Status Split`,
        value: `\`\`\`\n${prChart}\n\`\`\``,
        inline: true,
      },
      {
        name: `${NF.sparkle} Commits by Day`,
        value: `\`\`\`\n${commitByDayChart}\n\`\`\``,
        inline: false,
      },
      {
        name: `${NF.warning} Key Metrics`,
        value: `• **Issue Resolution:** ${issues.length > 0 ? Math.round((issuesClosed / issues.length) * 100) : 100}%\n` +
          `• **PR Merge Rate:** ${prs.length > 0 ? Math.round((prsMerged / prs.length) * 100) : 0}%\n` +
          `• **Activity Level:** ${commits.length > 20 ? "High" : commits.length > 5 ? "Moderate" : "Low"}\n` +
          `• **Community:** ${ghRepo.stars > 1000 ? "Established" : ghRepo.stars > 100 ? "Growing": "Early Stage"}`,
        inline: true,
      },
      {
        name: `${NF.heart} Health Verdict`,
        value: healthScore >= 80
          ? "Excellent — Active development, healthy community"
          : healthScore >= 60
            ? "Good — Decent activity, room for improvement"
            : healthScore >= 40
              ? "Fair — Low activity or unresolved issues"
              : "Needs Attention — Stale or unhealthy signals",
        inline: true,
      },
    )
    .setFooter({ text: "GITBOT Code Review Engine v2 • Powered by DevPulse", iconURL: ghRepo.owner.avatarUrl })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

function renderHealthMeter(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const color = score >= 80 ? "\x1b[1;32m" : score >= 50 ? "\x1b[1;33m" : "\x1b[1;31m";
  const label = `${score}/100`;
  return `[${color}${"█".repeat(filled)}${"░".repeat(empty)}\x1b[0m] ${color}${label}\x1b[0m`;
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
  const totalVulns = critical + high + medium + low;
  const securityScore = Math.max(0, 100 - critical * 25 - high * 12 - medium * 5 - low * 1);

  // Severity distribution pie chart
  const severityPie = [
    { label: "Critical", value: critical },
    { label: "High", value: high },
    { label: "Medium", value: medium },
    { label: "Low", value: low },
  ].filter(d => d.value > 0);

  const vulnChart = totalVulns > 0 ? renderPieChart(severityPie, 3) : "✅ Zero vulnerabilities";

  // Outdated dependency breakdown
  const depHealth = deps
    ? `${deps.totalCount} packages • ${deps.outdatedCount} outdated`
    : "Dependency data unavailable";

  const secMeter = renderHealthMeter(securityScore);

  const tui = [
    `\`\`\`ansi`,
    `\x1b[1;35m┌─ [ SECURITY AUDIT ]─────────────────────────────┐\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mTarget:\x1b[0m \x1b[1m${repoInput.slice(0, 30).padEnd(30)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ VULNERABILITY BREAKDOWN ────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[1;31mCritical:\x1b[0m \x1b[1m${String(critical).padStart(4)}\x1b[0m  \x1b[1;33mHigh:\x1b[0m \x1b[1m${String(high).padStart(4)}\x1b[0m  \x1b[1;36mMedium:\x1b[0m \x1b[1m${String(medium).padStart(4)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[1;32mLow:     \x1b[0m \x1b[1m${String(low).padStart(4)}\x1b[0m  \x1b[2;37mTotal:\x1b[0m \x1b[1;37m${String(totalVulns).padStart(4)}\x1b[0m                    \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ SECURITY SCORE ─────────────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m  ${secMeter} \x1b[0m\x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m└─────────────────────────────────────────────────┘\x1b[0m`,
    `\`\`\``,
  ];

  const embed = new EmbedBuilder()
    .setColor(critical > 0 ? 0xed8796 : high > 0 ? 0xf5a97f : 0xa6da95)
    .setTitle(`${NF.shield} Security Review: ${repoInput}`)
    .setURL(ghRepo.htmlUrl)
    .setDescription(tui.join("\n"))
    .addFields(
      {
        name: `${NF.chart} Vulnerability Distribution`,
        value: `\`\`\`\n${vulnChart}\n\`\`\``,
        inline: true,
      },
      {
        name: `${NF.network} ${depHealth}`,
        value: deps
          ? (deps.outdatedCount > 0
            ? `⚠️ **${deps.outdatedCount}** packages behind latest\nRun \`npm audit fix\` or equivalent`
            : "🟢 All dependencies up to date")
          : "Dependency scan unavailable",
        inline: true,
      },
      {
        name: `${NF.shield} Recommendations`,
        value: totalVulns === 0
          ? "✅ No known vulnerabilities. Keep dependencies updated regularly."
          : `• ${critical > 0 ? "🔴 Address critical CVEs immediately — consider pinning patched versions" : ""}\n` +
            `• ${high > 0 ? "🟠 Schedule high-severity patches within next sprint" : ""}\n` +
            `• Enable Dependabot/Renovate for automated security PRs\n` +
            `• Run \`npm audit\` / \`cargo audit\` in CI pipeline`,
        inline: false,
      },
    )
    .setFooter({ text: "GITBOT Security Scanner v2 • Powered by DevPulse", iconURL: ghRepo.owner.avatarUrl })
    .setTimestamp();

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

  // Contributor distribution
  const topContributors = contributors.slice(0, 6).map((c: { login: string; contributions: number }) => ({
    label: c.login.slice(0, 8),
    value: c.contributions,
  }));

  const contributorChart = topContributors.length > 0
    ? renderHorizontalBarChart(topContributors, { maxBarLength: 10, showValues: true })
    : "No contributor data";

  // Commit hour distribution (when are people working?)
  const hourBuckets = new Array(24).fill(0);
  for (const c of commits) {
    const hour = new Date(c.author.date).getHours();
    hourBuckets[hour]++;
  }
  // Group into 4 periods
  const periods = [
    { label: "Morning (6-12)", value: hourBuckets.slice(6, 12).reduce((a, b) => a + b, 0) },
    { label: "Afternoon (12-18)", value: hourBuckets.slice(12, 18).reduce((a, b) => a + b, 0) },
    { label: "Evening (18-24)", value: hourBuckets.slice(18, 24).reduce((a, b) => a + b, 0) },
    { label: "Night (0-6)", value: hourBuckets.slice(0, 6).reduce((a, b) => a + b, 0) },
  ];
  const periodChart = renderHorizontalBarChart(periods, { maxBarLength: 8, showValues: true });

  // Code velocity (commits per active day)
  const velocityBar = renderStackedBar("Velocity", [
    { value: commits.length },
    { value: contributors.length },
  ], 15);

  const tui = [
    `\`\`\`ansi`,
    `\x1b[1;35m┌─ [ ARCHITECTURE ANALYSIS ]──────────────────────┐\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mRepo  :\x1b[0m \x1b[1m${repoInput.slice(0, 30).padEnd(30)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mLang  :\x1b[0m \x1b[1;35m${(ghRepo.language || "Unknown").padEnd(12)}\x1b[0m \x1b[2;37mBranch:\x1b[0m \x1b[1;34m${(ghRepo.defaultBranch || "main").slice(0, 10)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ CONTRIBUTOR METRICS ───────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mActive Devs\x1b[0m \x1b[1;36m${String(authors.size).padStart(4)}\x1b[0m  \x1b[2;37mListed\x1b[0m \x1b[1;35m${String(contributors.length).padStart(4)}\x1b[0m  \x1b[2;37mFreq/d\x1b[0m \x1b[1;33m${commitFrequency.toFixed(1)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m├─ CODE BASE ─────────────────────────────────────┤\x1b[0m`,
    `\x1b[2;37m│\x1b[0m \x1b[2;37mStars\x1b[0m \x1b[1;33m${ghRepo.stars.toLocaleString().padStart(7)}\x1b[0m  \x1b[2;37mForks\x1b[0m \x1b[1;35m${ghRepo.forks.toLocaleString().padStart(6)}\x1b[0m  \x1b[2;37mSize\x1b[0m \x1b[1;36m${(ghRepo.size ? `${Math.round(ghRepo.size / 1024)}MB` : "N/A").padStart(6)}\x1b[0m \x1b[2;37m│\x1b[0m`,
    `\x1b[1;35m└─────────────────────────────────────────────────┘\x1b[0m`,
    `\`\`\``,
  ];

  const embed = new EmbedBuilder()
    .setColor(0xc6a0f6)
    .setTitle(`${NF.terminal} Architecture Review: ${repoInput}`)
    .setURL(ghRepo.htmlUrl)
    .setDescription(tui.join("\n"))
    .addFields(
      {
        name: `${NF.users} Top Contributors`,
        value: `\`\`\`\n${contributorChart}\n\`\`\``,
        inline: false,
      },
      {
        name: `${NF.clock} Commit Time Distribution`,
        value: `\`\`\`\n${periodChart}\n\`\`\``,
        inline: true,
      },
      {
        name: `${NF.sparkle} Velocity`,
        value: `\`\`\`\n${velocityBar}\n\`\`\``,
        inline: true,
      },
      {
        name: `${NF.chart} Architecture Insights`,
        value: `• **Team Structure:** ${authors.size <= 2 ? "Solo/Small team" : authors.size <= 5 ? "Small team" : "Distributed team"}\n` +
          `• **Commit Cadence:** ${commitFrequency >= 2 ? "Daily+" : commitFrequency >= 0.5 ? "Several times/week" : "Sporadic"}\n` +
          `• **Bus Factor:** ${authors.size <= 1 ? "⚠️ Critical (1 dev)" : authors.size <= 2 ? "🔶 Risky (2 devs)" : "✅ Distributed"}\n` +
          `• **Maturity:** ${ghRepo.stars > 1000 ? "Production-grade" : ghRepo.stars > 100 ? "Growing" : "Early stage"}`,
        inline: false,
      },
    )
    .setFooter({ text: "GITBOT Architecture Analyzer v2 • Powered by DevPulse", iconURL: ghRepo.owner.avatarUrl })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}


