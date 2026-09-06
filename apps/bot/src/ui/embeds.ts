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
  padText,
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
      text: "GITBOT TUI • Developer Operating System",
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
    tuiLine(`Status : ${NF.cross} Execution Failed`),
    tuiLine(`Error  : ${message}`),
    tuiDivider("RECOVERY"),
    tuiLine("Check parameters or repo access."),
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
  const descQuote = repo.description ? `> ${repo.description.replace(/\n/g, " ")}\n\n` : "";
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
    tuiLine(`Target  : ${repo.fullName}`),
    tuiLine(
      `Stack   : ${repo.language || "Plain Text"} • ${repo.isPrivate ? "Private" : "Public"}`,
    ),
    tuiLine(`Branch  : ${repo.defaultBranch} • ${repo.license?.spdxId || "No License"}`),
    tuiDivider("TELEMETRY"),
    tuiRow2(
      "Stars",
      `★ ${repo.stars.toLocaleString()}`,
      "Forks",
      `⑂ ${repo.forks.toLocaleString()}`,
    ),
    tuiRow2(
      "Issues",
      `☉ ${repo.openIssuesCount.toLocaleString()} Open`,
      "PRs",
      `⎇ ${metrics.activity.prsMerged} Merged`,
    ),
    tuiDivider("14-DAY ACTIVITY"),
    tuiRow2(
      "Commits",
      `${metrics.activity.commitsCount} pushed`,
      "PR Cycle",
      formatDuration(metrics.cycleTime.avgPrCycleTimeMs),
    ),
    tuiRow2(
      "Through",
      `${metrics.codingMetrics.prThroughputPerWeek.toFixed(1)} pr/wk`,
      "Resolved",
      `${metrics.codingMetrics.issueResolutionRatePercent.toFixed(0)}%`,
    ),
    tuiDivider("HEALTH INDEX"),
    tuiLine(`Health  : ${renderMeter(healthScore)} ${healthScore}/100`),
    tuiBottomBar(),
  ]);

  return new EmbedBuilder()
    .setColor(BrandColors.github)
    .setTitle(`${NF.github} ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(descQuote + tui)
    .setFooter({
      text: "GITBOT TUI • Use buttons below to switch tabs",
      iconURL: "https://github.githubassets.com/favicons/favicon.png",
    })
    .setTimestamp();
}

export function createRepoHealthEmbed(repo: GitHubRepo, health: RepoHealthScore): EmbedBuilder {
  const tui = renderTuiCard([
    tuiTopBar(`HEALTH SCORE: ${health.overallScore}/100`),
    tuiPrompt(`gitbot repo ${repo.fullName} --health`),
    tuiDivider("METRIC GAUGES"),
    tuiLine(`Activity    ${renderMeter(health.activityScore)} ${health.activityScore}/100`),
    tuiLine(`Maintenance ${renderMeter(health.maintenanceScore)} ${health.maintenanceScore}/100`),
    tuiLine(`CI / CD     ${renderMeter(health.ciScore)} ${health.ciScore}/100`),
    tuiLine(`Community   ${renderMeter(health.communityScore)} ${health.communityScore}/100`),
    tuiLine(`Releases    ${renderMeter(health.releasesScore)} ${health.releasesScore}/100`),
    tuiDivider("AUDIT METRICS"),
    tuiRow2(
      "Commits(30d)",
      `${health.details.commits30d}`,
      "Open Ratio",
      `${health.details.openIssuesRatio}`,
    ),
    tuiRow2(
      "Releases",
      `${health.details.releasesCount} tags`,
      "Status",
      health.overallScore >= 80 ? "HEALTHY" : "NEEDS WORK",
    ),
    tuiBottomBar(),
  ]);

  return createBaseEmbed(`${NF.heart} Health Score: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setColor(health.overallScore > 80 ? BrandColors.success : BrandColors.warning)
    .setDescription(tui);
}

export function createRepoGrowthEmbed(repo: GitHubRepo, growth: RepoGrowthMetrics): EmbedBuilder {
  const tui = renderTuiCard([
    tuiTopBar("30-DAY VELOCITY & GROWTH"),
    tuiPrompt(`gitbot repo ${repo.fullName} --growth`),
    tuiDivider("TELEMETRY ACCELERATION"),
    tuiLine(
      `Stars Total  : ${growth.starsTotal.toLocaleString()} (+${growth.starsDelta30d.toLocaleString()} in 30d)`,
    ),
    tuiLine(
      `Forks Total  : ${growth.forksTotal.toLocaleString()} (+${growth.forksDelta30d.toLocaleString()} in 30d)`,
    ),
    tuiLine(`Contributors : ${growth.contributorsTotal} authors`),
    tuiLine(
      `PRs Merged   : ${growth.prsMerged30d} (${(growth.prsMerged30d / 4.2).toFixed(1)} / week)`,
    ),
    tuiBottomBar(),
  ]);

  return createBaseEmbed(`${NF.speedometer} 30-Day Growth: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setColor(BrandColors.primary)
    .setURL(repo.htmlUrl)
    .setDescription(tui);
}

export function createDependenciesEmbed(repo: GitHubRepo, deps: RepoDependencies): EmbedBuilder {
  const topDepsLines = deps.dependencies.slice(0, 8).map((d) => {
    return tuiLine(`▸ ${padText(d.name, 22)} ${d.version}`);
  });

  const tui = renderTuiCard([
    tuiTopBar("DEPENDENCY MANIFEST"),
    tuiPrompt(`gitbot repo ${repo.fullName} --deps`),
    tuiDivider("ECOSYSTEM & PACKAGES"),
    tuiLine(`Manifest : ${deps.manifestFile} (${deps.ecosystem})`),
    tuiRow2("Total", `${deps.totalCount}`, "Outdated", `${deps.outdatedCount}`),
    tuiDivider("TOP PACKAGES"),
    ...(topDepsLines.length > 0 ? topDepsLines : [tuiLine("No dependencies detected.")]),
    tuiBottomBar(),
  ]);

  return createBaseEmbed(`${NF.network} Dependencies: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(tui);
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
  const ciStatusText =
    pr.ciStatus === "success"
      ? "[✓] Passing"
      : pr.ciStatus === "failure"
        ? "[✕] Failed"
        : "[⠋] Running";
  const conflictText = pr.mergeable === false ? "[✕] Conflicts" : "[✓] Clean";

  const tui = renderTuiCard([
    tuiTopBar(`PR #${pr.number} INSPECTION`),
    tuiPrompt(`gh pr view ${pr.number}`),
    tuiDivider("BRANCH & STATUS"),
    tuiLine(`Title    : ${pr.title}`),
    tuiLine(`Branch   : ${pr.headBranch} -> ${pr.baseBranch}`),
    tuiRow2("Author", `@${pr.author.login}`, "Status", statusBadge),
    tuiDivider("DIFF & CHECKS"),
    tuiLine(`Changes  : +${pr.additions} -${pr.deletions} (${pr.changedFiles} files)`),
    tuiRow2("CI Check", ciStatusText, "Conflicts", conflictText),
    tuiRow2("Reviews", `${approvedCount} approved`, "Cycle Time", formatDuration(pr.cycleTimeMs)),
    tuiBottomBar(),
  ]);

  const embed = createBaseEmbed(`${NF.gitPullRequest} PR #${pr.number}: ${pr.title}`)
    .setURL(pr.htmlUrl)
    .setColor(isReady ? BrandColors.success : BrandColors.warning)
    .setDescription(tui);

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
    return `${prefix} ${padText(r.name, 16)} ${statusIcon} (${r.headBranch})`;
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
    tuiPrompt(`gitbot whoami --stats`),
    tuiDivider(`USER: @${username.toUpperCase()}`),
    tuiRow2("Commits", `${userStats.commits}`, "PRs", `${userStats.prs}`),
    tuiRow2("Reviews", `${userStats.reviews}`, "Issues", `${userStats.issues}`),
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
    tuiLine(`Identity : @${account}`),
    tuiLine(`Status   : ${isConn ? "[✓] Connected via App" : "[✕] Disconnected"}`),
    tuiDivider("CAPABILITIES"),
    tuiLine(`Repos Read/Watch : [✓] Enabled`),
    tuiLine(`Issues & PRs     : [✓] Enabled`),
    tuiLine(`Actions CI       : [✓] Enabled`),
    tuiLine(`Write & Merge    : ${scopes.includes("write") ? "[✓] Enabled" : "[✕] Read Mode"}`),
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
    return tuiLine(`▸ ${sha} ${msg}`);
  });

  const tui = renderTuiCard([
    tuiTopBar("GIT LOG --ONELINE"),
    tuiPrompt(`git log -n 7 --oneline`),
    tuiDivider("RECENT COMMITS"),
    ...(commitLines.length > 0 ? commitLines : [tuiLine("No commits recorded.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = commits
    .slice(0, 6)
    .map(
      (c) =>
        `• [\`${c.sha.slice(0, 7)}\`](${c.htmlUrl}) ${c.message.split("\n")[0]} — *@${c.author.name}*`,
    )
    .join("\n");

  return createBaseEmbed(`${NF.gitCommit} Commits: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**Commit History:**\n${markdownLinks || "None"}`);
}

export function createRepoPrsEmbed(repo: GitHubRepo, prs: GitHubPullRequest[]): EmbedBuilder {
  const prLines = prs.slice(0, 7).map((p) => {
    const status = p.state.toUpperCase();
    return tuiLine(`[#${p.number}] ${padText(p.title, 24)} (${status})`);
  });

  const tui = renderTuiCard([
    tuiTopBar("PULL REQUEST QUEUE"),
    tuiPrompt(`gh pr list --state all --limit 7`),
    tuiDivider("RECENT PR RECORDS"),
    ...(prLines.length > 0 ? prLines : [tuiLine("No pull requests found.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = prs
    .slice(0, 6)
    .map((p) => `• [#${p.number}](${p.htmlUrl}) **${p.title}** (\`${p.state}\`)`)
    .join("\n");

  return createBaseEmbed(`${NF.gitPullRequest} Pull Requests: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**Quick PR Links:**\n${markdownLinks || "None"}`);
}

export function createRepoIssuesEmbed(repo: GitHubRepo, issues: GitHubIssue[]): EmbedBuilder {
  const issueLines = issues.slice(0, 7).map((i) => {
    const status = i.state.toUpperCase();
    return tuiLine(`[#${i.number}] ${padText(i.title, 24)} (${status})`);
  });

  const tui = renderTuiCard([
    tuiTopBar("ISSUE TRACKER"),
    tuiPrompt(`gh issue list --limit 7`),
    tuiDivider("ACTIVE ISSUES"),
    ...(issueLines.length > 0 ? issueLines : [tuiLine("No issues found.")]),
    tuiBottomBar(),
  ]);

  const markdownLinks = issues
    .slice(0, 6)
    .map((i) => `• [#${i.number}](${i.htmlUrl}) **${i.title}** (\`${i.state}\`)`)
    .join("\n");

  return createBaseEmbed(`${NF.issue} Issues: ${repo.fullName}`)
    .setAuthor({
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**Quick Issue Links:**\n${markdownLinks || "None"}`);
}

export function createRepoReleasesEmbed(repo: GitHubRepo, releases: GitHubRelease[]): EmbedBuilder {
  const releaseLines = releases.slice(0, 5).map((r) => {
    return tuiLine(`▸ ${padText(r.tagName, 12)} ${r.name}`);
  });

  const tui = renderTuiCard([
    tuiTopBar("RELEASE TAGS"),
    tuiPrompt(`gh release list --limit 5`),
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
      name: `GITBOT TUI • ${repo.fullName}`,
      iconURL: repo.owner.avatarUrl,
      url: repo.htmlUrl,
    })
    .setURL(repo.htmlUrl)
    .setDescription(`${tui}\n\n**Release Details:**\n${markdownLinks || "None"}`);
}

export function createSecurityAlertEmbed(secret: DetectedSecret): EmbedBuilder {
  return createBaseEmbed(`${NF.shield} Sensitive Credential Detected`)
    .setColor(BrandColors.danger)
    .setDescription(
      `A credential pattern matching **${secret.type}** was detected.\n\n**Fingerprint:** \`${secret.fingerprintHash.slice(0, 16)}...\`\n${NF.warning} **Action Required:** Revoke this credential immediately and delete the message below.`,
    );
}
