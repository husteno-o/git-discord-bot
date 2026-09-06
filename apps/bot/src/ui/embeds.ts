import type { PersonalStats } from "@devpulse/analytics";
import { formatBytes, formatDuration } from "@devpulse/core";
import type {
  GitHubBlameLine,
  GitHubCommit,
  GitHubDetailedPullRequest,
  GitHubFileContent,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRelease,
  GitHubRepo,
  GitHubSecurityAdvisory,
  InvestigationTimeline,
  RepoDashboardMetrics,
  RepoDependencies,
  RepoGrowthMetrics,
  RepoHealthScore,
} from "@devpulse/github";
import type { DetectedSecret } from "@devpulse/security";
import { EmbedBuilder } from "discord.js";
import { BrandColors } from "./colors.js";
import { NF } from "./icons.js";

function renderMeter(pct: number, length = 10): string {
  const filled = Math.min(length, Math.max(0, Math.round((pct / 100) * length)));
  return "▰".repeat(filled) + "▱".repeat(length - filled);
}

export function createBaseEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle(title)
    .setFooter({
      text: "GITBOT • Developer Operating System",
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
    .setTitle(`${NF.cross} Error`)
    .setDescription(message)
    .setFooter({ text: "GITBOT Error Console" })
    .setTimestamp();
}

// 1. REPO EMBEDS
export function createRepoDashboardEmbed(
  repo: GitHubRepo,
  metrics: RepoDashboardMetrics,
  _activeTab = "overview",
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.github)
    .setTitle(`${NF.github} ${repo.fullName}`)
    .setURL(repo.htmlUrl)
    .setDescription(repo.description || "No description provided.")
    .setThumbnail(repo.owner.avatarUrl);

  const telemetryBox = [
    "```text",
    "┌─ TELEMETRY ─────────────────────────────────────────",
    `│ Language : ${(repo.language || "Plain Text").padEnd(16)} Visibility : ${repo.isPrivate ? "Private" : "Public"}`,
    `│ Stars    : ${NF.star} ${repo.stars.toLocaleString().padEnd(13)} Forks      : ${NF.gitFork} ${repo.forks.toLocaleString()}`,
    `│ License  : ${(repo.license?.spdxId || "None").padEnd(16)} Branch     : ${NF.gitBranch} ${repo.defaultBranch}`,
    `│ Issues   :  ${repo.openIssuesCount.toLocaleString().padEnd(14)} PRs        : ${NF.gitPullRequest} ${metrics.activity.prsMerged} Merged`,
    "└─────────────────────────────────────────────────────",
    "```",
  ].join("\n");

  embed.addFields({
    name: `${NF.terminal} Repository Overview`,
    value: telemetryBox,
    inline: false,
  });

  const activityBox = [
    "```text",
    `• Commits (14d)  : ${metrics.activity.commitsCount}`,
    `• PRs Throughput : ${metrics.activity.prsOpened} opened / ${metrics.activity.prsMerged} merged`,
    `• Issues Closed  : ${metrics.activity.issuesClosed} of ${metrics.activity.issuesOpened}`,
    `• Releases Count : ${metrics.activity.releasesCount}`,
    "```",
  ].join("\n");

  embed.addFields({
    name: `${NF.speedometer} 14-Day Activity`,
    value: activityBox,
    inline: true,
  });

  const cycleBox = [
    "```text",
    `• Avg PR Cycle   : ${formatDuration(metrics.cycleTime.avgPrCycleTimeMs)}`,
    `• Time to Merge  : ${formatDuration(metrics.cycleTime.avgTimeToMergeMs)}`,
    `• PR Velocity    : ${metrics.codingMetrics.prThroughputPerWeek.toFixed(1)}/week`,
    `• Resolution     : ${metrics.codingMetrics.issueResolutionRatePercent.toFixed(0)}%`,
    "```",
  ].join("\n");

  embed.addFields({
    name: `${NF.clock} Cycle Time & Health`,
    value: cycleBox,
    inline: true,
  });

  return embed;
}

export function createRepoHealthEmbed(repo: GitHubRepo, health: RepoHealthScore): EmbedBuilder {
  const chart = [
    `Activity       [${renderMeter(health.activityScore)}]  ${health.activityScore}/100`,
    `Maintenance    [${renderMeter(health.maintenanceScore)}]  ${health.maintenanceScore}/100`,
    `CI Reliability [${renderMeter(health.ciScore)}]  ${health.ciScore}/100`,
    `Community      [${renderMeter(health.communityScore)}]  ${health.communityScore}/100`,
    `Releases       [${renderMeter(health.releasesScore)}]  ${health.releasesScore}/100`,
  ].join("\n");

  return createBaseEmbed(`${NF.heart} Repository Health Score: ${health.overallScore}/100`)
    .setColor(health.overallScore > 80 ? BrandColors.success : BrandColors.warning)
    .setThumbnail(repo.owner.avatarUrl)
    .setDescription(
      `Health breakdown for [**${repo.fullName}**](${repo.htmlUrl}):\n\`\`\`text\n${chart}\n\`\`\``,
    )
    .addFields(
      { name: "Commits (30d)", value: `\`${health.details.commits30d}\``, inline: true },
      { name: "Open Issues", value: `\`${health.details.openIssuesRatio}\``, inline: true },
      { name: "Releases", value: `\`${health.details.releasesCount}\``, inline: true },
    );
}

export function createRepoGrowthEmbed(repo: GitHubRepo, growth: RepoGrowthMetrics): EmbedBuilder {
  return createBaseEmbed(`${NF.speedometer} 30-Day Growth: ${repo.fullName}`)
    .setColor(BrandColors.primary)
    .setURL(repo.htmlUrl)
    .setDescription(
      [
        "```text",
        `Stars Total    : ${growth.starsTotal.toLocaleString().padEnd(10)} (+${growth.starsDelta30d.toLocaleString()} in 30d)`,
        `Forks Total    : ${growth.forksTotal.toLocaleString().padEnd(10)} (+${growth.forksDelta30d.toLocaleString()} in 30d)`,
        `Contributors   : ${growth.contributorsTotal.toString().padEnd(10)}`,
        `PRs Merged     : ${growth.prsMerged30d.toString().padEnd(10)} (Velocity: ${(growth.prsMerged30d / 4.2).toFixed(1)}/wk)`,
        "```",
      ].join("\n"),
    );
}

export function createDependenciesEmbed(repo: GitHubRepo, deps: RepoDependencies): EmbedBuilder {
  const topDeps = deps.dependencies
    .slice(0, 15)
    .map((d) => `• \`${d.name}\`: \`${d.version}\`${d.isDev ? " *(dev)*" : ""}`)
    .join("\n");
  return createBaseEmbed(`${NF.network} Dependency Graph: ${repo.fullName}`).setDescription(
    `Manifest: \`${deps.manifestFile}\` (${deps.ecosystem})\n\n**Total Packages:** \`${deps.totalCount}\` | **Outdated:** \`${deps.outdatedCount}\`\n\n${topDeps || "No dependencies detected."}`,
  );
}

// 2. PR POWER TOOLS
export function createDetailedPrEmbed(
  pr: GitHubDetailedPullRequest,
  _repoName?: string,
): EmbedBuilder {
  const isReady =
    pr.mergeable && pr.reviews.some((r) => r.state === "APPROVED") && pr.ciStatus !== "failure";
  const statusBadge = pr.draft
    ? `${NF.clock} Draft`
    : !pr.mergeable
      ? `${NF.cross} Merge Conflicts`
      : isReady
        ? `${NF.check} Ready to merge`
        : `${NF.clock} In Review`;

  const approvedCount = pr.reviews.filter((r) => r.state === "APPROVED").length;
  const ciStatusText =
    pr.ciStatus === "success"
      ? `${NF.check} Passing`
      : pr.ciStatus === "failure"
        ? `${NF.cross} Failed`
        : `${NF.spinner} Running`;
  const conflictText = pr.mergeable === false ? `${NF.cross} Conflicts` : `${NF.check} None`;

  const embed = createBaseEmbed(`${NF.gitPullRequest} PR #${pr.number}: ${pr.title}`)
    .setURL(pr.htmlUrl)
    .setColor(isReady ? BrandColors.success : BrandColors.warning)
    .setDescription(
      `**Status:** \`${statusBadge}\`\n**Branch:** \`${pr.headBranch}\` ${NF.arrowRight} \`${pr.baseBranch}\` | **Author:** @${pr.author.login}\n\n\`\`\`text\nDiff      : +${pr.additions} −${pr.deletions} (${pr.changedFiles} files changed)\nCI Status : ${ciStatusText}\nReviews   : ${approvedCount}/${Math.max(approvedCount, 2)} approved\nConflicts : ${conflictText}\nCycle Time: ${formatDuration(pr.cycleTimeMs)}\n\`\`\``,
    );

  const warnings: string[] = [];
  if (pr.changedFiles > 15 || pr.additions + pr.deletions > 500) {
    warnings.push(`${NF.warning} High change complexity (> 500 lines or > 15 files)`);
  }
  if (pr.waitingOn && pr.waitingOn.length > 0) {
    warnings.push(
      `${NF.clock} Waiting on review: ${pr.waitingOn.map((u) => `@${u}`).join(", ")} (${pr.waitingHours}h)`,
    );
  }
  if (pr.isStale) {
    warnings.push(`${NF.warning} Pull request has been inactive for over 14 days`);
  }

  if (warnings.length > 0) {
    embed.addFields({
      name: `${NF.warning} Review Bottlenecks & Warnings`,
      value: warnings.join("\n"),
      inline: false,
    });
  }

  return embed;
}

// 3. INVESTIGATION EMBED
export function createInvestigationEmbed(investigation: InvestigationTimeline): EmbedBuilder {
  const steps = investigation.events
    .map((ev, i) => {
      const arrow = i < investigation.events.length - 1 ? "\n   │\n   ▼" : "";
      return `**${ev.title}**\n*${ev.description}* (by @${ev.actor} • <t:${Math.floor(new Date(ev.timestamp).getTime() / 1000)}:R>)${arrow}`;
    })
    .join("\n");

  return createBaseEmbed(`${NF.search} ${investigation.title}`)
    .setColor(BrandColors.primary)
    .setDescription(
      `**Target:** \`${investigation.identifier}\`\n**Summary:** ${investigation.summary}\n\n**Lifecycle Traceability Timeline:**\n\n${steps}`,
    );
}

// 4. CODE & BLAME EMBEDS
export function createCodeViewEmbed(repo: string, file: GitHubFileContent): EmbedBuilder {
  const snippet = file.content.split("\n").slice(0, 15).join("\n");
  const embed = createBaseEmbed(`${NF.terminal} ${repo}: ${file.path}`)
    .setURL(file.htmlUrl)
    .setDescription(
      `**Size:** \`${formatBytes(file.size)}\` | **SHA:** \`${file.sha.slice(0, 7)}\`\n\`\`\`${file.path.split(".").pop() || ""}\n${snippet}\n\`\`\``,
    );

  if (file.lastCommit) {
    embed.addFields({
      name: "Last Changed",
      value: `Commit \`${file.lastCommit.sha}\` by **@${file.lastCommit.author}**\n"${file.lastCommit.message}"${file.lastCommit.relatedPr ? ` (via **PR #${file.lastCommit.relatedPr}**)` : ""}`,
      inline: false,
    });
  }

  return embed;
}

export function createBlameEmbed(repo: string, path: string, blame: GitHubBlameLine): EmbedBuilder {
  return createBaseEmbed(
    `${NF.gitCommit} Blame: ${repo}/${path} (Line ${blame.lineNumber})`,
  ).setDescription(
    `\`\`\`text\n${blame.code}\n\`\`\`\n` +
      `**Last Changed:** ${blame.relatedPrNumber ? `**PR #${blame.relatedPrNumber}**` : `Commit \`${blame.commitSha}\``}\n` +
      `**Author:** @${blame.commitAuthor}\n` +
      `**Commit:** \`${blame.commitSha}\`\n` +
      `**Reason:** "${blame.commitMessage}"`,
  );
}

// 5. ACTIONS TREE EMBED
export function createActionsTreeEmbed(repo: string, runs: any[]): EmbedBuilder {
  const lines = runs.slice(0, 5).map((r, i) => {
    const isLast = i === runs.length - 1;
    const prefix = isLast ? "└──" : "├──";
    const statusIcon =
      r.conclusion === "success" ? NF.check : r.conclusion === "failure" ? NF.cross : NF.spinner;
    return `${prefix} ${r.name.padEnd(16)} ${statusIcon} (${r.headBranch})`;
  });

  return createBaseEmbed(`${NF.robot} GitHub Actions: ${repo}`).setDescription(
    `Workflow runs on default branch:\n\`\`\`text\nmain\n${lines.join("\n") || "└── No workflow runs found"}\n\`\`\``,
  );
}

// 6. SECURITY EMBED
export function createSecurityAuditEmbed(
  repo: string,
  advisories: GitHubSecurityAdvisory[],
): EmbedBuilder {
  const critical = advisories.filter((a) => a.severity === "critical").length;
  const high = advisories.filter((a) => a.severity === "high").length;
  const medium = advisories.filter((a) => a.severity === "medium").length;
  const low = advisories.filter((a) => a.severity === "low").length;

  const topItems = advisories
    .slice(0, 5)
    .map((a) => {
      const badge =
        a.severity === "critical" ? NF.cross : a.severity === "high" ? NF.warning : NF.bullet;
      return `${badge} **${a.package.name}** (${a.package.ecosystem})\nAffected: \`${a.vulnerableVersionRange}\` | Fixed: \`${a.patchedVersion || "Pending"}\`\n[${a.summary}](${a.htmlUrl})`;
    })
    .join("\n\n");

  return createBaseEmbed(`${NF.shield} GitHub Security Center: ${repo}`)
    .setColor(
      critical > 0 ? BrandColors.danger : high > 0 ? BrandColors.warning : BrandColors.success,
    )
    .setDescription(
      `**Advisories Breakdown:**\nCritical: \`${critical}\` | High: \`${high}\` | Medium: \`${medium}\` | Low: \`${low}\`\n\n${topItems || `${NF.check} Zero active vulnerabilities detected!`}`,
    );
}

// 7. RELEASE NOTES EMBED
export function createReleaseNotesEmbed(repo: string, notes: any): EmbedBuilder {
  const embed = createBaseEmbed(`${NF.gitTag} Release Notes: ${repo} (${notes.version})`).setColor(
    BrandColors.primary,
  );

  if (notes.breaking && notes.breaking.length > 0) {
    embed.addFields({
      name: `${NF.warning} Breaking Changes`,
      value: notes.breaking.map((b: string) => `• ${b}`).join("\n"),
      inline: false,
    });
  }

  if (notes.features && notes.features.length > 0) {
    embed.addFields({
      name: `${NF.sparkle} Features`,
      value: notes.features.map((f: string) => `• ${f}`).join("\n"),
      inline: false,
    });
  }

  if (notes.fixes && notes.fixes.length > 0) {
    embed.addFields({
      name: " Bug Fixes",
      value: notes.fixes.map((f: string) => `• ${f}`).join("\n"),
      inline: false,
    });
  }

  if (notes.contributors && notes.contributors.length > 0) {
    embed.addFields({
      name: `${NF.users} Contributors`,
      value: notes.contributors.map((c: string) => `@${c}`).join(", "),
      inline: false,
    });
  }

  return embed;
}

// 8. HOME COMMAND CENTER EMBED
export function createHomeDashboardEmbed(
  username: string,
  userStats: { commits: number; prs: number; reviews: number; issues: number },
  attentionItems: string[],
  latestReleases: string[],
  trendingRepos: string[],
): EmbedBuilder {
  return createBaseEmbed(`${NF.github} GITBOT Developer Center — Welcome back, @${username}`)
    .setColor(BrandColors.primary)
    .setDescription(
      `**YOUR RECENT ACTIVITY**\n\`${userStats.commits}\` Commits • \`${userStats.prs}\` PRs • \`${userStats.reviews}\` Reviews • \`${userStats.issues}\` Issues\n\n**${NF.warning} NEEDS ATTENTION**\n${attentionItems.join("\n") || `${NF.check} No urgent bottlenecks or failing builds!`}\n\n**${NF.gitTag} RELEASES**\n${latestReleases.join("\n") || "No new releases in followed repositories."}\n\n**${NF.flame} TRENDING ON GITHUB**\n${trendingRepos.join("\n") || "Check /trending for top rising projects."}`,
    );
}

// 9. CONNECT STATUS EMBED
export function createConnectStatusEmbed(
  account: string,
  status: "connected" | "disconnected",
  scopes: string[],
): EmbedBuilder {
  return createBaseEmbed(`${NF.github} GITBOT Authentication Center`)
    .setColor(status === "connected" ? BrandColors.success : BrandColors.secondary)
    .setDescription(
      `**GitHub Identity:** \`@${account}\`\n**Status:** ${status === "connected" ? `${NF.check} Connected via GitHub App` : `${NF.cross} Disconnected`}\n\n**Granted Capabilities:**\n• Read Public & Selected Repositories: ${NF.check}\n• Read Issues & Pull Requests: ${NF.check}\n• Read Actions & Workflows: ${NF.check}\n• Write Actions (Approve / Merge): ${scopes.includes("write") ? `${NF.check} Enabled` : `${NF.cross} Disabled (Read Mode)`}\n\n*Credentials are secured using AES-256-GCM encryption.*`,
    );
}

// Retain compatibility helpers
export function createPersonalDashboardEmbed(stats: PersonalStats): EmbedBuilder {
  return createBaseEmbed(`${NF.user} Developer Dashboard: @${stats.githubUsername}`).addFields(
    { name: "Total Commits", value: `${stats.activity.commits}`, inline: true },
    { name: "PRs Merged", value: `${stats.activity.prsMerged}`, inline: true },
  );
}

export function createRepoCommitsEmbed(repo: GitHubRepo, commits: GitHubCommit[]): EmbedBuilder {
  const list = commits
    .slice(0, 10)
    .map(
      (c) =>
        `• [\`${c.sha.slice(0, 7)}\`](${c.htmlUrl}) ${c.message.split("\n")[0]} — *${c.author.name}*`,
    )
    .join("\n");
  return createBaseEmbed(`${NF.gitCommit} Recent Commits: ${repo.fullName}`).setDescription(
    list || "No commits found.",
  );
}

export function createRepoPrsEmbed(repo: GitHubRepo, prs: GitHubPullRequest[]): EmbedBuilder {
  const list = prs
    .slice(0, 10)
    .map((p) => `• [#${p.number}](${p.htmlUrl}) **${p.title}** (${p.state})`)
    .join("\n");
  return createBaseEmbed(`${NF.gitPullRequest} Pull Requests: ${repo.fullName}`).setDescription(
    list || "No pull requests found.",
  );
}

export function createRepoIssuesEmbed(repo: GitHubRepo, issues: GitHubIssue[]): EmbedBuilder {
  const list = issues
    .slice(0, 10)
    .map((i) => `• [#${i.number}](${i.htmlUrl}) **${i.title}** (${i.state})`)
    .join("\n");
  return createBaseEmbed(` Issues: ${repo.fullName}`).setDescription(list || "No issues found.");
}

export function createRepoReleasesEmbed(repo: GitHubRepo, releases: GitHubRelease[]): EmbedBuilder {
  const list = releases
    .slice(0, 5)
    .map(
      (r) =>
        `• [**${r.name}**](${r.htmlUrl}) (\`${r.tagName}\`) — <t:${Math.floor(new Date(r.publishedAt).getTime() / 1000)}:R>`,
    )
    .join("\n");
  return createBaseEmbed(`${NF.gitTag} Releases: ${repo.fullName}`).setDescription(
    list || "No releases found.",
  );
}

export function createSecurityAlertEmbed(secret: DetectedSecret): EmbedBuilder {
  return createBaseEmbed(`${NF.shield} Sensitive Credential Detected`)
    .setColor(BrandColors.danger)
    .setDescription(
      `A credential pattern matching **${secret.type}** was detected.\n\n**Fingerprint:** \`${secret.fingerprintHash.slice(0, 16)}...\`\n${NF.warning} **Action Required:** Revoke this credential immediately and delete the message below.`,
    );
}
