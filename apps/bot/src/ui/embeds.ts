import type {
  AiBugfixResult,
  AiCodeReviewResult,
  AiExplanationResult,
  AiSummaryResult,
} from "@devpulse/ai";
import type { PersonalStats } from "@devpulse/analytics";
import { formatBytes, formatDuration } from "@devpulse/core";
import type {
  GitHubBlameLine,
  GitHubCommit,
  GitHubDetailedIssue,
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
import { Macchiato } from "./colors.js";
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
    .setColor(Macchiato.mauve)
    .setTitle(title)
    .setFooter({
      text: "GITBOT v2.4.0 • Terminal Command Center",
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
    .setColor(Macchiato.red)
    .setTitle(`${NF.cross} Execution Error`)
    .setDescription(tui)
    .setFooter({ text: "GITBOT v2.4.0 • Diagnostic Console" })
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
      `${ANSI.dim}Health :${ANSI.reset} ${renderMeter(healthScore)} ${healthScore >= 80 ? ANSI.green : ANSI.yellow}${healthScore}/100${ANSI.reset}`,
    ),
    tuiBottomBar(),
  ]);

  const descQuote = repo.description ? `> *${repo.description.replace(/\n/g, " ")}*\n\n` : "";
  const badges = `⭐ **${repo.stars.toLocaleString()}** Stars  •  🍴 **${repo.forks.toLocaleString()}** Forks  •  ${repo.isPrivate ? "🔒 **Private**" : "🌐 **Public**"}  •  📜 \`${repo.license?.spdxId || "No License"}\`\n\n`;

  const embedColor =
    healthScore >= 80 ? Macchiato.green : healthScore >= 50 ? Macchiato.peach : Macchiato.red;

  return new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${NF.github} ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${descQuote}${badges}${tui}`)
    .setFooter({
      text: "GITBOT v2.4.0 • Terminal Command Center • Press buttons below to navigate",
      iconURL: "https://github.githubassets.com/favicons/favicon.png",
    })
    .setTimestamp();
}

export function createRepoHealthEmbed(repo: GitHubRepo, health: RepoHealthScore): EmbedBuilder {
  const tui = renderTuiCard([
    tuiTopBar(`HEALTH: ${health.overallScore}/100`),
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

  const badges = `❤️ **Health Score:** \`${health.overallScore}/100\`  •  ${health.overallScore >= 80 ? "🟢 **Healthy**" : "🟡 **Needs Maintenance**"}  •  📜 **${health.details.commits30d}** Commits (30d)\n\n`;

  const embedColor =
    health.overallScore >= 80
      ? Macchiato.green
      : health.overallScore >= 50
        ? Macchiato.peach
        : Macchiato.red;

  return createBaseEmbed(`${NF.heart} Health Score: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setColor(embedColor)
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
    .setColor(Macchiato.lavender)
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

  const badges = `📦 **Packages:** \`${deps.totalCount}\`  •  ${deps.outdatedCount > 0 ? `⚠️ **${deps.outdatedCount}** Outdated` : "🟢 **All Up to Date**"}  •  📄 \`${deps.manifestFile}\`\n\n`;

  return createBaseEmbed(`${NF.network} Dependencies: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT Terminal • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setColor(deps.outdatedCount > 0 ? Macchiato.peach : Macchiato.teal)
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

  const badges = `${isReady ? "🟢 **Ready to Merge**" : pr.draft ? "⚪ **Draft**" : !pr.mergeable ? "🔴 **Conflicts**" : "🟡 **In Review**"}  •  🌿 \`${pr.headBranch}\` ➔ \`${pr.baseBranch}\`  •  👤 **@${pr.author.login}**\n\n`;

  const prColor = pr.draft
    ? Macchiato.overlay1
    : !pr.mergeable
      ? Macchiato.red
      : isReady
        ? Macchiato.green
        : Macchiato.peach;

  const embed = createBaseEmbed(`${NF.gitPullRequest} PR #${pr.number}: ${pr.title}`)
    .setURL(pr.htmlUrl)
    .setColor(prColor)
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
    .setColor(Macchiato.sapphire)
    .setDescription(
      `🔍 **Target:** \`${investigation.identifier}\`\n> *${investigation.summary}*\n\n**Lifecycle Traceability Timeline:**\n\n${steps}`,
    );
}

// 4. CODE & BLAME EMBEDS
export function createCodeViewEmbed(repo: string, file: GitHubFileContent): EmbedBuilder {
  const snippet = file.content.split("\n").slice(0, 15).join("\n");
  const embed = createBaseEmbed(`${NF.terminal} ${repo}: ${file.path}`)
    .setURL(file.htmlUrl)
    .setColor(Macchiato.blue)
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
  return createBaseEmbed(`${NF.gitCommit} Blame: ${repo}/${path} (Line ${blame.lineNumber})`)
    .setColor(Macchiato.mauve)
    .setDescription(
      `\`\`\`text\n${blame.code}\n\`\`\`\n` +
        `**Last Changed:** ${blame.relatedPrNumber ? `**PR #${blame.relatedPrNumber}**` : `Commit \`${blame.commitSha}\``}\n` +
        `**Author:** @${blame.commitAuthor}\n` +
        `**Commit:** \`${blame.commitSha}\`\n` +
        `**Reason:** "${blame.commitMessage}"`,
    );
}

// 5. ACTIONS TREE EMBED
interface WorkflowRun {
  name: string;
  conclusion: string | null;
  headBranch: string;
}

export function createActionsTreeEmbed(repo: string, runs: WorkflowRun[]): EmbedBuilder {
  const lines = runs.slice(0, 5).map((r, i) => {
    const isLast = i === runs.length - 1;
    const prefix = isLast ? "└──" : "├──";
    const statusIcon =
      r.conclusion === "success" ? NF.check : r.conclusion === "failure" ? NF.cross : NF.spinner;
    return `${prefix} ${padAnsi(clipAnsi(r.name, 16), 16)} ${statusIcon} (${r.headBranch})`;
  });

  return createBaseEmbed(`${NF.robot} GitHub Actions: ${repo}`)
    .setColor(Macchiato.teal)
    .setDescription(
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
    .setColor(critical > 0 ? Macchiato.red : high > 0 ? Macchiato.peach : Macchiato.green)
    .setDescription(
      `🛡️ **Advisories Breakdown:**\nCritical: \`${critical}\` | High: \`${high}\` | Medium: \`${medium}\` | Low: \`${low}\`\n\n${topItems || `${NF.check} Zero active vulnerabilities detected!`}`,
    );
}

// 7. RELEASE NOTES EMBED
interface ReleaseNotes {
  version: string;
  breaking?: string[];
  features?: string[];
  fixes?: string[];
  contributors?: string[];
}

export function createReleaseNotesEmbed(repo: string, notes: ReleaseNotes): EmbedBuilder {
  const embed = createBaseEmbed(`${NF.gitTag} Release Notes: ${repo} (${notes.version})`).setColor(
    Macchiato.yellow,
  );

  if (notes.breaking && notes.breaking.length > 0) {
    embed.addFields({
      name: `${NF.warning} Breaking Changes`,
      value: notes.breaking.map((b) => `• ${b}`).join("\n"),
      inline: false,
    });
  }

  if (notes.features && notes.features.length > 0) {
    embed.addFields({
      name: `${NF.sparkle} Features`,
      value: notes.features.map((f) => `• ${f}`).join("\n"),
      inline: false,
    });
  }

  if (notes.fixes && notes.fixes.length > 0) {
    embed.addFields({
      name: `${NF.bug} Bug Fixes`,
      value: notes.fixes.map((f) => `• ${f}`).join("\n"),
      inline: false,
    });
  }

  if (notes.contributors && notes.contributors.length > 0) {
    embed.addFields({
      name: `${NF.users} Contributors`,
      value: notes.contributors.map((c) => `@${c}`).join(", "),
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
    .setColor(Macchiato.mauve)
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
    .setColor(isConn ? Macchiato.green : Macchiato.surface1)
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
    .setColor(Macchiato.sapphire)
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
    .setColor(Macchiato.teal)
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
    .setColor(Macchiato.peach)
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
    .setColor(Macchiato.yellow)
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**🏷️ Direct Release Links:**\n${markdownLinks || "None"}`);
}

export function createSecurityAlertEmbed(secret: DetectedSecret): EmbedBuilder {
  return createBaseEmbed(`${NF.shield} Sensitive Credential Detected`)
    .setColor(Macchiato.red)
    .setDescription(
      `A credential pattern matching **${secret.type}** was detected.\n\n**Fingerprint:** \`${secret.fingerprintHash.slice(0, 16)}...\`\n${NF.warning} **Action Required:** Revoke this credential immediately and delete the message below.`,
    );
}

// 10. AI CODE COPILOT & REVIEWER EMBEDS
export function createAiReviewEmbed(
  repo: GitHubRepo,
  pr: GitHubDetailedPullRequest,
  review: AiCodeReviewResult,
): EmbedBuilder {
  const riskColorAnsi =
    review.riskLevel === "CRITICAL"
      ? ANSI.red
      : review.riskLevel === "HIGH"
        ? ANSI.red
        : review.riskLevel === "MEDIUM"
          ? ANSI.yellow
          : ANSI.green;

  const riskColorEmbed =
    review.riskLevel === "CRITICAL"
      ? Macchiato.red
      : review.riskLevel === "HIGH"
        ? Macchiato.maroon
        : review.riskLevel === "MEDIUM"
          ? Macchiato.peach
          : Macchiato.green;

  const verdictAnsi = review.approvedForMerge
    ? `${ANSI.green}✓ Approved for Merge${ANSI.reset}`
    : `${ANSI.red}✕ Changes Requested${ANSI.reset}`;

  const critFindings = review.findings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH",
  );
  const warnFindings = review.findings.filter(
    (f) => f.severity === "MEDIUM" || f.severity === "LOW" || f.severity === "INFO",
  );

  const findingLines: string[] = [];
  if (review.findings.length === 0) {
    findingLines.push(
      tuiLine(`${ANSI.green}✓ Zero vulnerabilities or defects spotted.${ANSI.reset}`),
    );
  } else {
    for (const f of review.findings.slice(0, 4)) {
      const sevAnsi =
        f.severity === "CRITICAL"
          ? `${ANSI.red}[CRIT]`
          : f.severity === "HIGH"
            ? `${ANSI.red}[HIGH]`
            : f.severity === "MEDIUM"
              ? `${ANSI.yellow}[MED]`
              : `${ANSI.cyan}[LOW]`;
      const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "";
      findingLines.push(
        tuiLine(
          `${sevAnsi}${ANSI.reset} ${ANSI.white}${clipAnsi(f.title, 18)}${ANSI.reset} ${ANSI.dim}${clipAnsi(loc, 14)}${ANSI.reset}`,
        ),
      );
    }
  }

  const tui = renderTuiCard([
    tuiTopBar("AI COPILOT CODE REVIEW"),
    tuiPrompt(`gitbot ai review ${repo.fullName} #${pr.number}`),
    tuiDivider("HEALTH & RISK ASSESSMENT"),
    tuiRow2(
      "Risk Level",
      `${riskColorAnsi}${review.riskLevel}${ANSI.reset}`,
      "Score",
      `${review.score}/100`,
    ),
    tuiLine(`${ANSI.dim}Meter    :${ANSI.reset} ${renderMeter(review.score, 12)}`),
    tuiRow2("Verdict", verdictAnsi, "Engine", clipAnsi(review.poweredBy, 12)),
    tuiDivider(`FINDINGS (${critFindings.length} Crit/High • ${warnFindings.length} Med/Low)`),
    ...findingLines,
    tuiBottomBar(),
  ]);

  let mdDetails = `### ${review.approvedForMerge ? "✅ Approved for Merge" : "⚠️ Issues Detected"} • Quality Score: **${review.score}/100**\n`;
  mdDetails += `> ${review.summary}\n\n`;

  if (review.findings.length > 0) {
    mdDetails += `**🔍 Detected Code Smells & Security Advisories:**\n`;
    for (const f of review.findings.slice(0, 4)) {
      const icon = f.severity === "CRITICAL" || f.severity === "HIGH" ? "🔴" : "🟡";
      const loc = f.file ? `\`${f.file}${f.line ? `:${f.line}` : ""}\`` : "";
      mdDetails += `${icon} **${f.title}** ${loc}\n• ${f.description}\n`;
      if (f.suggestion) {
        mdDetails += `  *Fix:* \`${f.suggestion.slice(0, 120)}\`\n`;
      }
    }
    mdDetails += "\n";
  }

  if (review.diffProposal) {
    const trimmedDiff = review.diffProposal.slice(0, 600);
    mdDetails += `**💡 Proposed Unified Diff Fix:**\n\`\`\`diff\n${trimmedDiff}\n\`\`\`\n`;
  }

  mdDetails += `*⚡ AI Code Review powered by ${review.poweredBy}*`;

  return createBaseEmbed(`${NF.robot} AI Review: ${repo.fullName} #${pr.number}`)
    .setAuthor({
      name: `GITBOT Senior Copilot • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: pr.htmlUrl,
    })
    .setURL(pr.htmlUrl)
    .setColor(riskColorEmbed)
    .setDescription(`${tui}\n\n${mdDetails}`);
}

export function createAiSummaryEmbed(repo: GitHubRepo, summary: AiSummaryResult): EmbedBuilder {
  const timeframeLabel = summary.timeframe === "week" ? "Weekly Standup" : "Monthly Standup";

  const tui = renderTuiCard([
    tuiTopBar(`STANDUP CHANGELOG: ${summary.timeframe.toUpperCase()}`),
    tuiPrompt(`gitbot ai summarize ${repo.fullName} ${summary.timeframe}`),
    tuiDivider("SHIPPED VELOCITY"),
    tuiRow2(
      "Commits",
      `${ANSI.green}${summary.stats.commitsCount}${ANSI.reset}`,
      "Merged PRs",
      `${ANSI.magenta}${summary.stats.prsMergedCount}${ANSI.reset}`,
    ),
    tuiRow2(
      "Authors",
      `${ANSI.cyan}${summary.stats.activeAuthorsCount}${ANSI.reset}`,
      "Engine",
      clipAnsi(summary.poweredBy, 12),
    ),
    tuiDivider("HEADLINE"),
    tuiLine(`${ANSI.yellow}${clipAnsi(summary.headline, 37)}${ANSI.reset}`),
    tuiBottomBar(),
  ]);

  let md = `### 📊 ${timeframeLabel} Summary for [${repo.fullName}](${repo.htmlUrl})\n`;
  md += `> **${summary.headline}**\n\n`;

  if (summary.features.length > 0) {
    md += `**🚀 New Features & Capabilities:**\n`;
    for (const feat of summary.features.slice(0, 4)) {
      md += `• ${feat}\n`;
    }
    md += "\n";
  }

  if (summary.fixes.length > 0) {
    md += `**🐛 Bug Fixes & Reliability:**\n`;
    for (const fix of summary.fixes.slice(0, 4)) {
      md += `• ${fix}\n`;
    }
    md += "\n";
  }

  if (summary.perfAndChores.length > 0) {
    md += `**⚡ Maintenance & Performance:**\n`;
    for (const chore of summary.perfAndChores.slice(0, 3)) {
      md += `• ${chore}\n`;
    }
    md += "\n";
  }

  if (summary.topContributors.length > 0) {
    md += `**👥 Core Contributors:** ${summary.topContributors.map((c) => `\`${c}\``).join(", ")}\n\n`;
  }

  md += `*⚡ Changelog & Standup analysis powered by ${summary.poweredBy}*`;

  return createBaseEmbed(`${NF.sparkle} Standup Changelog: ${repo.fullName} (${summary.timeframe})`)
    .setAuthor({
      name: `GITBOT Standup Copilot • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setColor(Macchiato.teal)
    .setDescription(`${tui}\n\n${md}`);
}

export function createAiBugfixEmbed(
  repo: GitHubRepo,
  issue: GitHubDetailedIssue,
  bugfix: AiBugfixResult,
): EmbedBuilder {
  const confAnsi =
    bugfix.confidence === "HIGH"
      ? `${ANSI.green}HIGH`
      : bugfix.confidence === "MEDIUM"
        ? `${ANSI.yellow}MEDIUM`
        : `${ANSI.red}LOW`;

  const confColor =
    bugfix.confidence === "HIGH"
      ? Macchiato.green
      : bugfix.confidence === "MEDIUM"
        ? Macchiato.peach
        : Macchiato.red;

  const loc = `${bugfix.targetFile}${bugfix.targetLine ? `:${bugfix.targetLine}` : ""}`;

  const tui = renderTuiCard([
    tuiTopBar("DIAGNOSTIC & REPAIR COPILOT"),
    tuiPrompt(`gitbot ai bugfix ${repo.fullName} #${issue.number}`),
    tuiDivider("TRIAGE & TARGET"),
    tuiLine(
      `${ANSI.dim}Issue   :${ANSI.reset} ${ANSI.cyan}#${issue.number}${ANSI.reset} ${clipAnsi(issue.title, 26)}`,
    ),
    tuiLine(`${ANSI.dim}Target  :${ANSI.reset} ${ANSI.yellow}${clipAnsi(loc, 30)}${ANSI.reset}`),
    tuiRow2("Confidence", `${confAnsi}${ANSI.reset}`, "Engine", clipAnsi(bugfix.poweredBy, 12)),
    tuiDivider("ROOT CAUSE"),
    tuiLine(`${ANSI.white}${clipAnsi(bugfix.rootCause, 37)}${ANSI.reset}`),
    tuiBottomBar(),
  ]);

  let md = `### 🩺 Root Cause Diagnosis for [#${issue.number}](${issue.htmlUrl})\n`;
  md += `> **${bugfix.rootCause}**\n\n`;
  md += `**🎯 Identified Culprit:** \`${loc}\` (Confidence: **${bugfix.confidence}**)\n\n`;
  md += `**📝 Solution Explanation:**\n${bugfix.explanation}\n\n`;

  if (bugfix.proposedPatch) {
    const trimmedPatch = bugfix.proposedPatch.slice(0, 700);
    md += `**🛠️ Proposed Remediation Patch:**\n\`\`\`diff\n${trimmedPatch}\n\`\`\`\n`;
  }

  if (bugfix.testSuggestions.length > 0) {
    md += `**🧪 Suggested Verification Tests:**\n`;
    for (const test of bugfix.testSuggestions) {
      md += `• \`${test}\`\n`;
    }
    md += "\n";
  }

  md += `*⚡ Bugfix synthesis powered by ${bugfix.poweredBy}*`;

  return createBaseEmbed(`${NF.tools} AI Bugfix: ${repo.fullName} #${issue.number}`)
    .setAuthor({
      name: `GITBOT Diagnostic Copilot • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: issue.htmlUrl,
    })
    .setURL(issue.htmlUrl)
    .setColor(confColor)
    .setDescription(`${tui}\n\n${md}`);
}

export function createAiExplainEmbed(
  repo: GitHubRepo,
  file: GitHubFileContent,
  explanation: AiExplanationResult,
  line?: number,
): EmbedBuilder {
  const complexityAnsi =
    explanation.complexity === "High"
      ? `${ANSI.red}High`
      : explanation.complexity === "Moderate"
        ? `${ANSI.yellow}Moderate`
        : `${ANSI.green}Low`;

  const complexityColor =
    explanation.complexity === "High"
      ? Macchiato.red
      : explanation.complexity === "Moderate"
        ? Macchiato.peach
        : Macchiato.blue;

  const complexityMeter =
    explanation.complexity === "High"
      ? `${ANSI.red}${"█".repeat(8)}${"░".repeat(2)}${ANSI.reset}`
      : explanation.complexity === "Moderate"
        ? `${ANSI.yellow}${"█".repeat(5)}${"░".repeat(5)}${ANSI.reset}`
        : `${ANSI.green}${"█".repeat(2)}${"░".repeat(8)}${ANSI.reset}`;

  const loc = `${file.path}${line ? ` (L${line})` : ""}`;

  const tui = renderTuiCard([
    tuiTopBar("CODE ARCHITECTURE EXPLAINER"),
    tuiPrompt(`gitbot ai explain ${repo.fullName} ${file.path}`),
    tuiDivider("SOURCE SPECIFICATION"),
    tuiLine(`${ANSI.dim}File       :${ANSI.reset} ${ANSI.cyan}${clipAnsi(loc, 28)}${ANSI.reset}`),
    tuiRow2("Complexity", `${complexityAnsi}${ANSI.reset}`, "Size", formatBytes(file.size)),
    tuiRow2(
      "Engine",
      clipAnsi(explanation.poweredBy, 12),
      "Language",
      clipAnsi(file.name.split(".").pop() || "code", 10),
    ),
    tuiDivider("ARCHITECTURAL ROLE"),
    tuiLine(`${ANSI.white}${clipAnsi(explanation.architectureRole, 37)}${ANSI.reset}`),
    tuiDivider("COMPLEXITY RADAR"),
    tuiLine(`${ANSI.dim}Load:${ANSI.reset} ${complexityMeter} ${complexityAnsi}${explanation.complexity}${ANSI.reset}`),
    tuiBottomBar(),
  ]);

  let md = `### 🧠 Code Analysis: [${file.path}](${file.htmlUrl})\n`;
  md += `> **Architecture Role:** ${explanation.architectureRole}\n\n`;
  md += `**📖 Summary:**\n${explanation.summary}\n\n`;

  if (explanation.keyComponents.length > 0) {
    md += `**🧩 Key Components & Responsibilities:**\n`;
    for (const comp of explanation.keyComponents.slice(0, 6)) {
      md += `• **\`${comp.name}\`**: ${comp.purpose}\n`;
    }
    md += "\n";
  }

  if (explanation.dependencies.length > 0) {
    const depList = explanation.dependencies.slice(0, 8).map((d) => `\`${d}\``).join(", ");
    const depCount = explanation.dependencies.length > 8 ? ` (+${explanation.dependencies.length - 8} more)` : "";
    md += `**📦 Dependencies (${explanation.dependencies.length}):** ${depList}${depCount}\n\n`;
  }

  if (explanation.securityConsiderations.length > 0) {
    md += `**🛡️ Security & Performance Considerations:**\n`;
    for (const sec of explanation.securityConsiderations.slice(0, 4)) {
      md += `• ${sec}\n`;
    }
    md += "\n";
  }

  md += `*⚡ Code intelligence powered by ${explanation.poweredBy}*`;

  return createBaseEmbed(`${NF.brain} Code Explanation: ${file.name}`)
    .setAuthor({
      name: `GITBOT Intelligence Copilot • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: file.htmlUrl,
    })
    .setURL(file.htmlUrl)
    .setColor(complexityColor)
    .setDescription(`${tui}\n\n${md}`);
}

export function createWatchNotificationEmbed(event: {
  repoFullName: string;
  eventType: "release" | "pull_request" | "security_alert";
  actor: string;
  actorAvatar: string;
  payload: Record<string, unknown>;
  eventUrl: string;
  timestamp: Date;
}): EmbedBuilder {
  const payload = event.payload;
  let title = "";
  let description = "";
  let color: number = Macchiato.blue;

  switch (event.eventType) {
    case "release": {
      const release = payload.release as { tag_name?: string; name?: string; html_url?: string } | undefined;
      const tagName = release?.tag_name || payload.tag_name || "unknown";
      title = `${NF.gitTag} New Release: ${event.repoFullName}`;
      description = `**Tag:** \`${tagName}\`\n**Published by:** @${event.actor}`;
      color = Macchiato.yellow;
      break;
    }
    case "pull_request": {
      const pr = payload.pull_request as { number?: number; title?: string; html_url?: string; user?: { login: string } } | undefined;
      title = `${NF.gitPullRequest} New PR: ${event.repoFullName}`;
        description = pr
          ? `**[#${pr.number}](${pr.html_url}) ${pr.title || ""}\n**Author:** @${pr.user?.login || event.actor}`
          : `**Created by:** @${event.actor}`;
      color = Macchiato.sapphire;
      break;
    }
    case "security_alert": {
      title = `${NF.shield} Security Alert: ${event.repoFullName}`;
      description = `**Reported by:** @${event.actor}\n**Action required:** Review and patch the identified vulnerability.`;
      color = Macchiato.red;
      break;
    }
  }

  const timeStr = Math.floor(event.timestamp.getTime() / 1000);

  return createBaseEmbed(title)
    .setColor(color)
    .setAuthor({
      name: `@${event.actor}`,
      iconURL: event.actorAvatar || undefined,
    })
    .setDescription(description)
    .addFields({
      name: "View on GitHub",
      value: `[${event.repoFullName}](${event.eventUrl})`,
      inline: false,
    })
    .setFooter({
      text: `GITBOT Watchtower • <t:${timeStr}:R>`,
      iconURL: "https://github.githubassets.com/favicons/favicon.png",
    })
    .setTimestamp();
}
