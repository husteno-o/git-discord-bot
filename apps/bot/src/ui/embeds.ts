import type { PersonalStats, TeamStats } from "@devpulse/analytics";
import {
  formatDuration,
  renderHorizontalBarChart,
  renderProgressBar,
  renderSparkline,
} from "@devpulse/core";
import type {
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRelease,
  GitHubRepo,
  RepoDashboardMetrics,
} from "@devpulse/github";
import type { NewsItem } from "@devpulse/news";
import type { DetectedSecret, VulnerabilityRecord } from "@devpulse/security";
import type { TrendingRepo, TrendingTech } from "@devpulse/trending";
import { EmbedBuilder } from "discord.js";
import { BrandColors } from "./colors.js";

export function createBaseEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle(title)
    .setFooter({
      text: "DevPulse • Developer Command Center",
      iconURL: "https://github.githubassets.com/favicons/favicon.png",
    })
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }
  return embed;
}

export function createErrorEmbed(error: Error | string): EmbedBuilder {
  const message = typeof error === "string" ? error : error.message;
  return new EmbedBuilder()
    .setColor(BrandColors.danger)
    .setTitle("❌ Error")
    .setDescription(message)
    .setFooter({ text: "DevPulse Error Handler" })
    .setTimestamp();
}

export function createRepoDashboardEmbed(
  repo: GitHubRepo,
  metrics: RepoDashboardMetrics,
  activeTab = "overview",
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.github)
    .setTitle(`📦 ${repo.fullName}`)
    .setURL(repo.htmlUrl)
    .setDescription(repo.description || "No description provided.")
    .setThumbnail(repo.owner.avatarUrl);

  // Tab: Overview & Master Dashboard
  if (activeTab === "overview") {
    // 1. Repository Header Stats
    embed.addFields({
      name: "📌 Repository Overview",
      value: [
        `**Language:** \`${repo.language || "Unknown"}\` | **Stars:** ⭐ \`${repo.stars.toLocaleString()}\` | **Forks:** 🍴 \`${repo.forks.toLocaleString()}\``,
        `**Open Issues:** 🐛 \`${repo.openIssuesCount.toLocaleString()}\` | **Branch:** \`${repo.defaultBranch}\``,
        `**License:** \`${repo.license?.spdxId || "None"}\` | **Visibility:** \`${repo.isPrivate ? "Private" : "Public"}\``,
      ].join("\n"),
      inline: false,
    });

    // 2. Activity Log (Weekly snapshot)
    embed.addFields({
      name: "📊 Activity (Past 14 Days)",
      value: [
        `• Commits: **${metrics.activity.commitsCount}**`,
        `• PRs Opened / Merged: **${metrics.activity.prsOpened}** / **${metrics.activity.prsMerged}**`,
        `• Issues Opened / Closed: **${metrics.activity.issuesOpened}** / **${metrics.activity.issuesClosed}**`,
        `• Releases: **${metrics.activity.releasesCount}**`,
      ].join("\n"),
      inline: true,
    });

    // 3. Cycle Time
    const prCycle =
      metrics.cycleTime.avgPrCycleTimeMs > 0
        ? formatDuration(metrics.cycleTime.avgPrCycleTimeMs)
        : "N/A";
    const issueCycle =
      metrics.cycleTime.avgIssueCycleTimeMs > 0
        ? formatDuration(metrics.cycleTime.avgIssueCycleTimeMs)
        : "N/A";
    embed.addFields({
      name: "⏱️ Cycle Time",
      value: [
        `• Avg Time to Merge: **${prCycle}**`,
        `• Issue Resolution: **${issueCycle}**`,
        `• PR Throughput: **${metrics.codingMetrics.prThroughputPerWeek}/wk**`,
      ].join("\n"),
      inline: true,
    });

    // 4. Focus Breakdown
    embed.addFields({
      name: "🎯 Focus Breakdown",
      value: [
        `Coding: \`${renderProgressBar(metrics.focus.codingPercent, 8)}\``,
        `Reviews: \`${renderProgressBar(metrics.focus.reviewsPercent, 8)}\``,
        `Issues: \`${renderProgressBar(metrics.focus.issuesPercent, 8)}\``,
        `Docs: \`${renderProgressBar(metrics.focus.docsPercent, 8)}\``,
        `Maintenance: \`${renderProgressBar(metrics.focus.maintenancePercent, 8)}\``,
      ].join("\n"),
      inline: false,
    });

    // 5. Workload Balance (Days of Week)
    const workloadChart = renderHorizontalBarChart(
      [
        { label: "Mon", value: metrics.workload.mon },
        { label: "Tue", value: metrics.workload.tue },
        { label: "Wed", value: metrics.workload.wed },
        { label: "Thu", value: metrics.workload.thu },
        { label: "Fri", value: metrics.workload.fri },
        { label: "Sat", value: metrics.workload.sat },
        { label: "Sun", value: metrics.workload.sun },
      ],
      { maxBarLength: 10 },
    );

    embed.addFields({
      name: "📅 Workload Balance (Activity by Day)",
      value: `\`\`\`\n${workloadChart}\n\`\`\``,
      inline: false,
    });
  }

  return embed;
}

export function createRepoCommitsEmbed(repo: GitHubRepo, commits: GitHubCommit[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle(`🔨 Recent Commits — ${repo.fullName}`)
    .setURL(`${repo.htmlUrl}/commits`);

  if (commits.length === 0) {
    embed.setDescription("No recent commits found.");
    return embed;
  }

  const lines = commits.slice(0, 10).map((c) => {
    const shortSha = c.sha.slice(0, 7);
    const firstLine = c.message.split("\n")[0].slice(0, 60);
    return `[\`${shortSha}\`](${c.htmlUrl}) **${firstLine}** — *${c.author.name}*`;
  });

  embed.setDescription(lines.join("\n\n"));
  return embed;
}

export function createRepoPrsEmbed(repo: GitHubRepo, prs: GitHubPullRequest[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.purple)
    .setTitle(`🔀 Pull Requests — ${repo.fullName}`)
    .setURL(`${repo.htmlUrl}/pulls`);

  if (prs.length === 0) {
    embed.setDescription("No recent pull requests found.");
    return embed;
  }

  const lines = prs.slice(0, 10).map((pr) => {
    const icon = pr.mergedAt ? "🟣" : pr.state === "open" ? "🟢" : "🔴";
    return `${icon} [**#${pr.number} ${pr.title.slice(0, 55)}**](${pr.htmlUrl})\n└ *by @${pr.author.login}*`;
  });

  embed.setDescription(lines.join("\n\n"));
  return embed;
}

export function createRepoIssuesEmbed(repo: GitHubRepo, issues: GitHubIssue[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.warning)
    .setTitle(`🐛 Issues — ${repo.fullName}`)
    .setURL(`${repo.htmlUrl}/issues`);

  if (issues.length === 0) {
    embed.setDescription("No issues found.");
    return embed;
  }

  const lines = issues.slice(0, 10).map((i) => {
    const icon = i.state === "open" ? "🟢" : "🟣";
    return `${icon} [**#${i.number} ${i.title.slice(0, 55)}**](${i.htmlUrl})\n└ *💬 ${i.commentsCount} comments • opened by @${i.author.login}*`;
  });

  embed.setDescription(lines.join("\n\n"));
  return embed;
}

export function createRepoReleasesEmbed(repo: GitHubRepo, releases: GitHubRelease[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.success)
    .setTitle(`🚀 Releases — ${repo.fullName}`)
    .setURL(`${repo.htmlUrl}/releases`);

  if (releases.length === 0) {
    embed.setDescription("No releases found.");
    return embed;
  }

  const lines = releases.slice(0, 8).map((r) => {
    const badge = r.prerelease ? "⚠️ Pre-release" : "✅ Release";
    const date = new Date(r.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `🏷️ [**${r.tagName} — ${r.name || r.tagName}**](${r.htmlUrl})\n└ *${badge} • published ${date}*`;
  });

  embed.setDescription(lines.join("\n\n"));
  return embed;
}

export function createPersonalDashboardEmbed(stats: PersonalStats): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.info)
    .setTitle(`👨‍💻 Developer Dashboard — @${stats.githubUsername}`)
    .setDescription(`Productivity and activity summary for the past **${stats.periodDays} days**.`);

  // 1. Activity Summary
  embed.addFields({
    name: "📈 Recent Activity",
    value: [
      `• Commits: **${stats.activity.commits}**`,
      `• PRs Opened: **${stats.activity.prsOpened}**`,
      `• PRs Merged: **${stats.activity.prsMerged}**`,
      `• PR Reviews: **${stats.activity.reviews}**`,
      `• Issues: **${stats.activity.issues}**`,
    ].join("\n"),
    inline: true,
  });

  // 2. Cycle Time
  embed.addFields({
    name: "⏱️ Cycle Time",
    value: [
      `• Avg PR Turnaround: **${stats.cycleTime.avgPrTime}**`,
      `• Avg Review Response: **${stats.cycleTime.avgReviewTime}**`,
    ].join("\n"),
    inline: true,
  });

  // 3. Workload
  const workloadChart = renderHorizontalBarChart(
    [
      { label: "Mon", value: stats.workload.Mon || 0 },
      { label: "Tue", value: stats.workload.Tue || 0 },
      { label: "Wed", value: stats.workload.Wed || 0 },
      { label: "Thu", value: stats.workload.Thu || 0 },
      { label: "Fri", value: stats.workload.Fri || 0 },
    ],
    { maxBarLength: 10 },
  );

  embed.addFields({
    name: "📅 Workload Balance",
    value: `\`\`\`\n${workloadChart}\n\`\`\``,
    inline: false,
  });

  // 4. Focus Breakdown
  embed.addFields({
    name: "🎯 Focus Distribution",
    value: [
      `Coding: \`${renderProgressBar(stats.focus.coding, 10)}\``,
      `Reviews: \`${renderProgressBar(stats.focus.reviews, 10)}\``,
      `Issues: \`${renderProgressBar(stats.focus.issues, 10)}\``,
      `Docs: \`${renderProgressBar(stats.focus.documentation, 10)}\``,
    ].join("\n"),
    inline: false,
  });

  return embed;
}

export function createTeamDashboardEmbed(stats: TeamStats): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle("👥 Team Productivity & Workload Dashboard")
    .setDescription(
      `Health metrics across **${stats.repoCount} configured repositories** over the past **${stats.periodDays} days**.`,
    );

  embed.addFields({
    name: "📊 Team Output",
    value: [
      `• Total Commits: **${stats.totalCommits}**`,
      `• PRs Opened / Merged: **${stats.totalPrs}** / **${stats.mergedPrs}**`,
      `• Issues Resolved: **${stats.closedIssues}**`,
      `• Active Contributors: **${stats.activeContributors}**`,
      `• Avg Time to Merge: **${stats.avgTimeToMerge}**`,
    ].join("\n"),
    inline: false,
  });

  if (stats.topRepositories.length > 0) {
    const repoList = stats.topRepositories.map(
      (r) => `• **${r.name}** — ⭐ \`${r.stars}\` | 🐛 \`${r.openIssues} open issues\``,
    );
    embed.addFields({
      name: "📁 Monitored Repositories",
      value: repoList.join("\n"),
      inline: false,
    });
  }

  return embed;
}

export function createSecurityAlertEmbed(secret: DetectedSecret): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BrandColors.danger)
    .setTitle("🚨 Potential Secret Detected in Message")
    .setDescription(
      `A sensitive credential pattern was detected in your message. Immediate rotation is recommended to prevent unauthorized access.\n\n**Secret Type:** \`${secret.type}\`\n**Masked Value:** \`${secret.maskedSnippet}\`\n**Fingerprint:** \`${secret.fingerprintHash}\`\n\n🛡️ **Recommended Action:**\n${secret.recommendation}`,
    )
    .setFooter({ text: "DevPulse Zero-Log Secret Scanner • Secret was NOT stored or logged" })
    .setTimestamp();
}

export function createCveEmbed(record: VulnerabilityRecord): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.danger)
    .setTitle(`🛡️ ${record.id}`)
    .setDescription(record.summary.slice(0, 1000));

  if (record.affectedPackage) {
    embed.addFields({
      name: "📦 Affected Package",
      value: `\`${record.affectedPackage.name}\` (${record.affectedPackage.ecosystem})`,
      inline: true,
    });
  }

  embed.addFields({
    name: "⚠️ Severity",
    value: `\`${record.severity || "Unknown"}\``,
    inline: true,
  });

  if (record.fixedVersions.length > 0) {
    embed.addFields({
      name: "✅ Fixed In",
      value: record.fixedVersions.map((v) => `\`${v}\``).join(", "),
      inline: false,
    });
  }

  if (record.references.length > 0) {
    embed.addFields({
      name: "🔗 References",
      value: record.references.map((r) => `• [${new URL(r).hostname}](${r})`).join("\n"),
      inline: false,
    });
  }

  return embed;
}

export function createMonitorStatusEmbed(monitor: any, history: any[]): EmbedBuilder {
  const isUp = monitor.isHealthy;
  const color = isUp ? BrandColors.success : BrandColors.danger;
  const statusEmoji = isUp ? "🟢 UP" : "🔴 DOWN";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📡 Monitor: ${monitor.name}`)
    .setDescription(`**Target:** \`${monitor.url}\`\n**Current Status:** ${statusEmoji}`)
    .addFields(
      { name: "HTTP Status", value: `\`${monitor.lastStatus ?? "N/A"}\``, inline: true },
      {
        name: "Latency",
        value: `\`${monitor.lastResponseTimeMs ? `${monitor.lastResponseTimeMs}ms` : "N/A"}\``,
        inline: true,
      },
      { name: "Check Interval", value: `\`${monitor.intervalSeconds}s\``, inline: true },
    );

  if (monitor.lastError) {
    embed.addFields({ name: "⚠️ Last Error", value: `\`${monitor.lastError}\``, inline: false });
  }

  if (history.length > 0) {
    const sparklineValues = history.map((h) => h.responseTimeMs).reverse();
    const sparkline = renderSparkline(sparklineValues);
    const historyText = history
      .slice(0, 5)
      .map((h) => {
        const icon = h.isHealthy ? "🟢" : "🔴";
        const code = h.statusCode ?? "ERR";
        const date = new Date(h.checkedAt).toLocaleTimeString("en-US", { hour12: false });
        return `${icon} \`${code}\` (${h.responseTimeMs}ms) at ${date}`;
      })
      .join("\n");

    embed.addFields({
      name: `📜 Recent Checks (${sparkline})`,
      value: historyText,
      inline: false,
    });
  }

  return embed;
}

export function createNewsEmbed(items: NewsItem[], category: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle(`📰 Developer News — ${category.toUpperCase()}`)
    .setDescription(`Latest headlines curated from verified tech feeds.`);

  if (items.length === 0) {
    embed.setDescription("No recent news found for this category.");
    return embed;
  }

  for (const item of items.slice(0, 5)) {
    embed.addFields({
      name: item.title,
      value: `${item.summary}\n🔗 [Read on ${item.source}](${item.url})`,
      inline: false,
    });
  }

  return embed;
}

export function createTrendingEmbed(
  repos: TrendingRepo[],
  tech: TrendingTech[],
  category = "repositories",
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle("🔥 Trending in Developer Ecosystem")
    .setFooter({ text: "Updated live from public GitHub & open source registries" });

  if (category === "technologies") {
    embed.setDescription("Fastest growing developer tools, frameworks, and engines.");
    for (const t of tech) {
      embed.addFields({
        name: `${t.name} (${t.growth})`,
        value: `*${t.category}*\n${t.description}`,
        inline: false,
      });
    }
    return embed;
  }

  embed.setDescription("Top trending GitHub repositories with highest star velocity.");
  if (repos.length === 0) {
    embed.setDescription("No trending repositories retrieved at this moment.");
    return embed;
  }

  for (const r of repos.slice(0, 5)) {
    embed.addFields({
      name: `⭐ ${r.fullName} (\`${r.language}\`)`,
      value: `${r.description}\n⭐ \`${r.stars.toLocaleString()}\` stars | 🍴 \`${r.forks.toLocaleString()}\` forks\n[View Repository](${r.url})`,
      inline: false,
    });
  }

  return embed;
}
