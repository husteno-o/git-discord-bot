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
import {
  ANSI,
  clipAnsi,
  padAnsi,
  renderMeter,
  renderTuiCard,
  tuiBottomBar,
  tuiDivider,
  tuiLine,
  tuiPrompt,
  tuiRow2,
  tuiTopBar,
} from "./tui.js";

export function createBaseEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BrandColors.primary)
    .setTitle(title)
    .setFooter({
      text: "GITBOT v2.4.0 • Interactive Terminal Console",
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
  const tui = renderTuiCard([
    tuiTopBar("GITBOT ERROR"),
    tuiPrompt("gitbot --last-error"),
    tuiDivider("DIAGNOSTIC TRACE"),
    tuiLine(`${ANSI.red}Status : ✕ Execution Failed${ANSI.reset}`),
    tuiLine(`${ANSI.yellow}Error  : ${clipAnsi(message, 30)}${ANSI.reset}`),
    tuiDivider("RECOVERY"),
    tuiLine(`${ANSI.dim}Check parameters or repository access.${ANSI.reset}`),
    tuiBottomBar(),
  ]);

  return new EmbedBuilder()
    .setColor(BrandColors.danger)
    .setTitle(`${NF.cross} Execution Error`)
    .setDescription(tui)
    .setFooter({ text: "GITBOT Error Console" })
    .setTimestamp();
}

// 1. REPO EMBEDS
export function createRepoDashboardEmbed(
  repo: GitHubRepo,
  metrics: RepoDashboardMetrics,
  _activeTab = "overview",
): EmbedBuilder {
  const healthScore = Math.round(
    Math.min(
      100,
      Math.max(
        60,
        metrics.codingMetrics.issueResolutionRatePercent * 0.4 +
          Math.min(metrics.activity.commitsCount * 1.5, 40) +
          (metrics.activity.prsMerged > 0 ? 20 : 10),
      ),
    ),
  );

  const tui = renderTuiCard([
    tuiTopBar("GITBOT TUI v2.4.0"),
    tuiPrompt(`gitbot repo ${repo.fullName}`),
    tuiDivider("METADATA"),
    tuiLine(
      `${ANSI.dim}Target :${ANSI.reset} ${ANSI.bold}${clipAnsi(repo.fullName, 29)}${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Stack  :${ANSI.reset} ${ANSI.magenta}${repo.language || "Plain Text"}${ANSI.reset} • ${repo.isPrivate ? `${ANSI.red}Private` : `${ANSI.green}Public`}${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Branch :${ANSI.reset} ${ANSI.blue}${repo.defaultBranch}${ANSI.reset} • ${ANSI.yellow}${repo.license?.spdxId || "No License"}${ANSI.reset}`,
    ),
    tuiDivider("TELEMETRY"),
    tuiRow2(
      "Stars",
      `${ANSI.yellow}${repo.stars.toLocaleString()}${ANSI.reset}`,
      "Forks",
      `${ANSI.magenta}${repo.forks.toLocaleString()}${ANSI.reset}`,
    ),
    tuiRow2(
      "Issues",
      `${ANSI.green}${repo.openIssuesCount.toLocaleString()} Open${ANSI.reset}`,
      "PRs",
      `${ANSI.cyan}${metrics.activity.prsMerged} Merged${ANSI.reset}`,
    ),
    tuiDivider("14-DAY ACTIVITY"),
    tuiRow2(
      "Commits",
      `${ANSI.cyan}${metrics.activity.commitsCount} pushed${ANSI.reset}`,
      "PR Time",
      `${ANSI.white}${formatDuration(metrics.cycleTime.avgPrCycleTimeMs)}${ANSI.reset}`,
    ),
    tuiRow2(
      "Through",
      `${ANSI.white}${metrics.codingMetrics.prThroughputPerWeek.toFixed(1)} pr/wk${ANSI.reset}`,
      "Resolved",
      `${ANSI.green}${metrics.codingMetrics.issueResolutionRatePercent.toFixed(0)}%${ANSI.reset}`,
    ),
    tuiDivider("HEALTH INDEX"),
    tuiLine(
      `${ANSI.dim}Health :${ANSI.reset} ${renderMeter(healthScore)} ${ANSI.green}${healthScore}/100${ANSI.reset}`,
    ),
    tuiBottomBar(),
  ]);

  const descQuote = repo.description ? `> *${repo.description.replace(/\n/g, " ")}*\n\n` : "";
  const badges = `⭐ **${repo.stars.toLocaleString()}** Stars  •  🍴 **${repo.forks.toLocaleString()}** Forks  •  ${repo.isPrivate ? "🔴 **Private**" : "🟢 **Public**"}  •  🏷️ **${repo.license?.spdxId || "No License"}**\n\n`;

  return new EmbedBuilder()
    .setColor(healthScore >= 80 ? BrandColors.success : BrandColors.warning)
    .setTitle(`${NF.github} ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${descQuote}${badges}${tui}`)
    .setFooter({
      text: "GITBOT v2.4.0 • Interactive Terminal Console • Press buttons below to navigate",
      iconURL: "https://github.githubassets.com/favicons/favicon.png",
    })
    .setTimestamp();
}

export function createRepoHealthEmbed(repo: GitHubRepo, health: RepoHealthScore): EmbedBuilder {
  const tui = renderTuiCard([
    tuiTopBar(`HEALTH SCORE: ${health.overallScore}/100`),
    tuiPrompt(`gitbot repo ${repo.fullName} --health`),
    tuiDivider("METRIC GAUGES"),
    tuiLine(
      `${ANSI.dim}Activity    ${ANSI.reset}${renderMeter(health.activityScore)} ${ANSI.green}${health.activityScore}/100${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Maintenance ${ANSI.reset}${renderMeter(health.maintenanceScore)} ${ANSI.green}${health.maintenanceScore}/100${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}CI / CD     ${ANSI.reset}${renderMeter(health.ciScore)} ${ANSI.green}${health.ciScore}/100${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Community   ${ANSI.reset}${renderMeter(health.communityScore)} ${ANSI.green}${health.communityScore}/100${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Releases    ${ANSI.reset}${renderMeter(health.releasesScore)} ${ANSI.green}${health.releasesScore}/100${ANSI.reset}`,
    ),
    tuiDivider("AUDIT METRICS"),
    tuiRow2(
      "Commits(30d)",
      `${ANSI.cyan}${health.details.commits30d}${ANSI.reset}`,
      "Open Ratio",
      `${ANSI.yellow}${health.details.openIssuesRatio}${ANSI.reset}`,
    ),
    tuiRow2(
      "Releases",
      `${ANSI.magenta}${health.details.releasesCount} tags${ANSI.reset}`,
      "Status",
      health.overallScore >= 80
        ? `${ANSI.green}HEALTHY${ANSI.reset}`
        : `${ANSI.yellow}NEEDS WORK${ANSI.reset}`,
    ),
    tuiBottomBar(),
  ]);

  const badges = `❤️ **Score:** \`${health.overallScore}/100\`  •  ${health.overallScore >= 80 ? "🟢 **Healthy**" : "🟡 **Needs Maintenance**"}  •  📜 **${health.details.commits30d}** Commits (30d)\n\n`;

  return createBaseEmbed(`${NF.heart} Health Score: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setColor(health.overallScore > 80 ? BrandColors.success : BrandColors.warning)
    .setDescription(`${badges}${tui}`);
}

export function createRepoGrowthEmbed(repo: GitHubRepo, growth: RepoGrowthMetrics): EmbedBuilder {
  const tui = renderTuiCard([
    tuiTopBar("30-DAY VELOCITY & GROWTH"),
    tuiPrompt(`gitbot repo ${repo.fullName} --growth`),
    tuiDivider("TELEMETRY ACCELERATION"),
    tuiLine(
      `${ANSI.dim}Stars Total  :${ANSI.reset} ${ANSI.yellow}${growth.starsTotal.toLocaleString()} (+${growth.starsDelta30d.toLocaleString()} in 30d)${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Forks Total  :${ANSI.reset} ${ANSI.magenta}${growth.forksTotal.toLocaleString()} (+${growth.forksDelta30d.toLocaleString()} in 30d)${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}Contributors :${ANSI.reset} ${ANSI.cyan}${growth.contributorsTotal} authors${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}PRs Merged   :${ANSI.reset} ${ANSI.green}${growth.prsMerged30d} (${(growth.prsMerged30d / 4.2).toFixed(1)}/wk)${ANSI.reset}`,
    ),
    tuiBottomBar(),
  ]);

  const badges = `📈 **Velocity:** \`${(growth.prsMerged30d / 4.2).toFixed(1)} PRs/wk\`  •  ⭐ **+${growth.starsDelta30d}** Stars  •  👥 **${growth.contributorsTotal}** Authors\n\n`;

  return createBaseEmbed(`${NF.speedometer} 30-Day Growth: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setColor(BrandColors.primary)
    .setURL(repo.htmlUrl)
    .setDescription(`${badges}${tui}`);
}

export function createDependenciesEmbed(repo: GitHubRepo, deps: RepoDependencies): EmbedBuilder {
  const topDepsLines = deps.dependencies.slice(0, 8).map((d) => {
    return tuiLine(
      `${ANSI.cyan}▸${ANSI.reset} ${ANSI.bold}${padAnsi(clipAnsi(d.name, 22), 22)}${ANSI.reset} ${ANSI.green}${clipAnsi(d.version, 13)}${ANSI.reset}`,
    );
  });

  const tui = renderTuiCard([
    tuiTopBar("DEPENDENCY MANIFEST"),
    tuiPrompt(`gitbot repo ${repo.fullName} --deps`),
    tuiDivider("ECOSYSTEM & PACKAGES"),
    tuiLine(
      `${ANSI.dim}Manifest :${ANSI.reset} ${ANSI.yellow}${clipAnsi(deps.manifestFile, 18)}${ANSI.reset} (${deps.ecosystem})`,
    ),
    tuiRow2(
      "Total",
      `${ANSI.cyan}${deps.totalCount}${ANSI.reset}`,
      "Outdated",
      deps.outdatedCount > 0
        ? `${ANSI.red}${deps.outdatedCount}${ANSI.reset}`
        : `${ANSI.green}0${ANSI.reset}`,
    ),
    tuiDivider("TOP PACKAGES"),
    ...(topDepsLines.length > 0 ? topDepsLines : [tuiLine("No dependencies detected.")]),
    tuiBottomBar(),
  ]);

  const badges = `📦 **Packages:** \`${deps.totalCount}\`  •  ${deps.outdatedCount > 0 ? `⚠️ **${deps.outdatedCount}** Outdated` : "🟢 **All Up to Date**"}  •  📄 **${deps.manifestFile}**\n\n`;

  return createBaseEmbed(`${NF.network} Dependencies: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${badges}${tui}`);
}

// 2. PR POWER TOOLS
export function createDetailedPrEmbed(
  pr: GitHubDetailedPullRequest,
  _repoName?: string,
): EmbedBuilder {
  const isReady =
    pr.mergeable && pr.reviews.some((r) => r.state === "APPROVED") && pr.ciStatus !== "failure";
  const statusBadge = pr.draft
    ? "Draft"
    : !pr.mergeable
      ? "Conflicts"
      : isReady
        ? "Ready to merge"
        : "In Review";

  const approvedCount = pr.reviews.filter((r) => r.state === "APPROVED").length;
  const ciColor =
    pr.ciStatus === "success" ? ANSI.green : pr.ciStatus === "failure" ? ANSI.red : ANSI.yellow;
  const ciStatusText = `${ciColor}${pr.ciStatus === "success" ? "✓ Passing" : pr.ciStatus === "failure" ? "✕ Failed" : "⠋ Running"}${ANSI.reset}`;
  const conflictText =
    pr.mergeable === false
      ? `${ANSI.red}✕ Conflicts${ANSI.reset}`
      : `${ANSI.green}✓ Clean${ANSI.reset}`;

  const tui = renderTuiCard([
    tuiTopBar(`PR #${pr.number} INSPECTION`),
    tuiPrompt(`gh pr view ${pr.number}`),
    tuiDivider("BRANCH & STATUS"),
    tuiLine(`${ANSI.dim}Title    :${ANSI.reset} ${clipAnsi(pr.title, 28)}`),
    tuiLine(
      `${ANSI.dim}Branch   :${ANSI.reset} ${ANSI.cyan}${clipAnsi(pr.headBranch, 12)}${ANSI.reset} ➔ ${ANSI.blue}${clipAnsi(pr.baseBranch, 12)}${ANSI.reset}`,
    ),
    tuiRow2("Author", `@${pr.author.login}`, "Status", statusBadge),
    tuiDivider("DIFF & CHECKS"),
    tuiLine(
      `${ANSI.dim}Changes  :${ANSI.reset} ${ANSI.green}+${pr.additions}${ANSI.reset} ${ANSI.red}-${pr.deletions}${ANSI.reset} (${pr.changedFiles} files)`,
    ),
    tuiRow2("CI Check", ciStatusText, "Conflicts", conflictText),
    tuiRow2(
      "Reviews",
      `${ANSI.green}${approvedCount} approved${ANSI.reset}`,
      "Cycle Time",
      formatDuration(pr.cycleTimeMs),
    ),
    tuiBottomBar(),
  ]);

  const badges = `${isReady ? "🟢 **Ready to Merge**" : pr.draft ? "⚪ **Draft**" : "🟡 **In Review**"}  •  🌿 \`${pr.headBranch}\` ➔ \`${pr.baseBranch}\`  •  👤 **@${pr.author.login}**\n\n`;

  const embed = createBaseEmbed(`${NF.gitPullRequest} PR #${pr.number}: ${pr.title}`)
    .setURL(pr.htmlUrl)
    .setColor(isReady ? BrandColors.success : BrandColors.warning)
    .setDescription(`${badges}${tui}`);

  const warnings: string[] = [];
  if (pr.changedFiles > 15 || pr.additions + pr.deletions > 500) {
    warnings.push(`${NF.warning} **High change complexity** (> 500 lines or > 15 files)`);
  }
  if (pr.waitingOn && pr.waitingOn.length > 0) {
    warnings.push(
      `${NF.clock} **Waiting on review:** ${pr.waitingOn.map((u) => `@${u}`).join(", ")} (${pr.waitingHours}h)`,
    );
  }
  if (pr.isStale) {
    warnings.push(`${NF.warning} **Stale PR:** Inactive for over 14 days`);
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
    return `${prefix} ${padAnsi(clipAnsi(r.name, 16), 16)} ${statusIcon} (${r.headBranch})`;
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
      name: `${NF.bug} Bug Fixes`,
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
  const tui = renderTuiCard([
    tuiTopBar("DEVELOPER CENTER"),
    tuiPrompt("gitbot whoami --stats"),
    tuiDivider(`USER: @${username.toUpperCase()}`),
    tuiRow2(
      "Commits",
      `${ANSI.cyan}${userStats.commits}${ANSI.reset}`,
      "PRs",
      `${ANSI.green}${userStats.prs}${ANSI.reset}`,
    ),
    tuiRow2(
      "Reviews",
      `${ANSI.yellow}${userStats.reviews}${ANSI.reset}`,
      "Issues",
      `${ANSI.magenta}${userStats.issues}${ANSI.reset}`,
    ),
    tuiBottomBar(),
  ]);

  return createBaseEmbed(`${NF.github} GITBOT Developer Center — @${username}`)
    .setColor(BrandColors.primary)
    .setDescription(
      `${tui}\n\n**${NF.warning} NEEDS ATTENTION**\n${attentionItems.join("\n") || `${NF.check} No urgent bottlenecks or failing builds!`}\n\n**${NF.gitTag} RELEASES**\n${latestReleases.join("\n") || "No new releases in followed repositories."}\n\n**${NF.flame} TRENDING ON GITHUB**\n${trendingRepos.join("\n") || "Check /trending for top rising projects."}`,
    );
}

// 9. CONNECT STATUS EMBED
export function createConnectStatusEmbed(
  account: string,
  status: "connected" | "disconnected",
  scopes: string[],
): EmbedBuilder {
  const isConn = status === "connected";
  const tui = renderTuiCard([
    tuiTopBar("AUTH SUBSYSTEM"),
    tuiPrompt("gitbot auth status"),
    tuiDivider("SESSION METADATA"),
    tuiLine(`${ANSI.dim}Identity :${ANSI.reset} ${ANSI.bold}@${account}${ANSI.reset}`),
    tuiLine(
      `${ANSI.dim}Status   :${ANSI.reset} ${isConn ? `${ANSI.green}✓ Connected via App` : `${ANSI.red}✕ Disconnected`}${ANSI.reset}`,
    ),
    tuiDivider("CAPABILITIES"),
    tuiLine(`${ANSI.dim}Repos Read/Watch :${ANSI.reset} ${ANSI.green}✓ Enabled${ANSI.reset}`),
    tuiLine(`${ANSI.dim}Issues & PRs     :${ANSI.reset} ${ANSI.green}✓ Enabled${ANSI.reset}`),
    tuiLine(`${ANSI.dim}Actions CI       :${ANSI.reset} ${ANSI.green}✓ Enabled${ANSI.reset}`),
    tuiLine(
      `${ANSI.dim}Write & Merge    :${ANSI.reset} ${scopes.includes("write") ? `${ANSI.green}✓ Enabled` : `${ANSI.yellow}✕ Read Mode`}${ANSI.reset}`,
    ),
    tuiBottomBar(),
  ]);

  return createBaseEmbed(`${NF.github} Authentication Center`)
    .setColor(isConn ? BrandColors.success : BrandColors.secondary)
    .setDescription(`${tui}\n\n*Credentials are encrypted at rest with AES-256-GCM.*`);
}

// Retain compatibility helpers
export function createPersonalDashboardEmbed(stats: PersonalStats): EmbedBuilder {
  return createBaseEmbed(`${NF.user} Developer Dashboard: @${stats.githubUsername}`).addFields(
    { name: "Total Commits", value: `${stats.activity.commits}`, inline: true },
    { name: "PRs Merged", value: `${stats.activity.prsMerged}`, inline: true },
  );
}

export function createRepoCommitsEmbed(repo: GitHubRepo, commits: GitHubCommit[]): EmbedBuilder {
  const commitLines = commits.slice(0, 7).map((c) => {
    const sha = c.sha.slice(0, 7);
    const msg = c.message.split("\n")[0];
    return tuiLine(
      `${ANSI.cyan}▸${ANSI.reset} ${ANSI.yellow}${sha}${ANSI.reset} ${clipAnsi(msg, 28)}`,
    );
  });

  const tui = renderTuiCard([
    tuiTopBar("GIT LOG --ONELINE"),
    tuiPrompt("git log -n 7 --oneline"),
    tuiDivider("RECENT COMMITS"),
    ...(commitLines.length > 0 ? commitLines : [tuiLine("No commits recorded.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = commits
    .slice(0, 5)
    .map(
      (c) =>
        `• [\`${c.sha.slice(0, 7)}\`](${c.htmlUrl}) **${c.message.split("\n")[0].slice(0, 45)}** — *@${c.author.name}*`,
    )
    .join("\n");

  return createBaseEmbed(`${NF.gitCommit} Commits: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**📜 Direct Commit Links:**\n${markdownLinks || "None"}`);
}

export function createRepoPrsEmbed(repo: GitHubRepo, prs: GitHubPullRequest[]): EmbedBuilder {
  const prLines = prs.slice(0, 7).map((p) => {
    const status = p.state.toUpperCase();
    const color = p.state === "open" ? ANSI.green : ANSI.magenta;
    return tuiLine(
      `${ANSI.cyan}[#${p.number}]${ANSI.reset} ${padAnsi(clipAnsi(p.title, 22), 22)} (${color}${status}${ANSI.reset})`,
    );
  });

  const tui = renderTuiCard([
    tuiTopBar("PULL REQUEST QUEUE"),
    tuiPrompt("gh pr list --state all --limit 7"),
    tuiDivider("RECENT PR RECORDS"),
    ...(prLines.length > 0 ? prLines : [tuiLine("No pull requests found.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = prs
    .slice(0, 5)
    .map((p) => `• [#${p.number}](${p.htmlUrl}) **${p.title.slice(0, 45)}** (\`${p.state}\`)`)
    .join("\n");

  return createBaseEmbed(`${NF.gitPullRequest} Pull Requests: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**🔀 Direct PR Links:**\n${markdownLinks || "None"}`);
}

export function createRepoIssuesEmbed(repo: GitHubRepo, issues: GitHubIssue[]): EmbedBuilder {
  const issueLines = issues.slice(0, 7).map((i) => {
    const status = i.state.toUpperCase();
    const color = i.state === "open" ? ANSI.green : ANSI.magenta;
    return tuiLine(
      `${ANSI.cyan}[#${i.number}]${ANSI.reset} ${padAnsi(clipAnsi(i.title, 22), 22)} (${color}${status}${ANSI.reset})`,
    );
  });

  const tui = renderTuiCard([
    tuiTopBar("ISSUE TRACKER"),
    tuiPrompt("gh issue list --limit 7"),
    tuiDivider("ACTIVE ISSUES"),
    ...(issueLines.length > 0 ? issueLines : [tuiLine("No issues found.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = issues
    .slice(0, 5)
    .map((i) => `• [#${i.number}](${i.htmlUrl}) **${i.title.slice(0, 45)}** (\`${i.state}\`)`)
    .join("\n");

  return createBaseEmbed(`${NF.issue} Issues: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**🐞 Direct Issue Links:**\n${markdownLinks || "None"}`);
}

export function createRepoReleasesEmbed(repo: GitHubRepo, releases: GitHubRelease[]): EmbedBuilder {
  const releaseLines = releases.slice(0, 5).map((r) => {
    return tuiLine(
      `${ANSI.cyan}▸${ANSI.reset} ${ANSI.yellow}${padAnsi(clipAnsi(r.tagName, 10), 10)}${ANSI.reset} ${clipAnsi(r.name, 22)}`,
    );
  });

  const tui = renderTuiCard([
    tuiTopBar("RELEASE TAGS"),
    tuiPrompt("gh release list --limit 5"),
    tuiDivider("PUBLISHED RELEASES"),
    ...(releaseLines.length > 0 ? releaseLines : [tuiLine("No releases found.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = releases
    .slice(0, 5)
    .map(
      (r) =>
        `• [**${r.name}**](${r.htmlUrl}) (\`${r.tagName}\`) — <t:${Math.floor(new Date(r.publishedAt).getTime() / 1000)}:R>`,
    )
    .join("\n");

  return createBaseEmbed(`${NF.gitTag} Releases: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**🏷️ Direct Release Links:**\n${markdownLinks || "None"}`);
}

export function createSecurityAlertEmbed(secret: DetectedSecret): EmbedBuilder {
  return createBaseEmbed(`${NF.shield} Sensitive Credential Detected`)
    .setColor(BrandColors.danger)
    .setDescription(
      `A credential pattern matching **${secret.type}** was detected.\n\n**Fingerprint:** \`${secret.fingerprintHash.slice(0, 16)}...\`\n${NF.warning} **Action Required:** Revoke this credential immediately and delete the message below.`,
    );
}
