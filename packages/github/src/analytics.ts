import type {
  GitHubCommit,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRelease,
  RepoDashboardMetrics,
} from "./types.js";

export function computeRepoDashboardMetrics(
  commits: GitHubCommit[],
  prs: GitHubPullRequest[],
  issues: GitHubIssue[],
  releases: GitHubRelease[],
): RepoDashboardMetrics {
  // 1. Activity Log
  const mergedPrs = prs.filter((p) => p.mergedAt !== null);
  const closedIssues = issues.filter((i) => i.closedAt !== null);

  const activity = {
    commitsCount: commits.length,
    prsOpened: prs.length,
    prsMerged: mergedPrs.length,
    issuesOpened: issues.length,
    issuesClosed: closedIssues.length,
    releasesCount: releases.length,
  };

  // 2. Workload balance across days of the week
  const workload = {
    mon: 0,
    tue: 0,
    wed: 0,
    thu: 0,
    fri: 0,
    sat: 0,
    sun: 0,
  };

  const dayKeys: Array<keyof typeof workload> = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  for (const c of commits) {
    const d = new Date(c.author.date);
    const day = dayKeys[d.getUTCDay()];
    workload[day] += 1;
  }
  for (const p of prs) {
    const d = new Date(p.createdAt);
    const day = dayKeys[d.getUTCDay()];
    workload[day] += 1;
  }

  // 3. Focus breakdown
  // Coding (commits + prs)
  // Reviews (estimated based on merged & closed PR ratio)
  // Issues (issue discussions)
  // Docs (commits or PRs mentioning docs, readme, guide)
  // Maintenance (ci, chore, refactor, deps)
  let docsScore = 0;
  let maintenanceScore = 0;
  let generalCodingScore = 0;

  for (const c of commits) {
    const msg = c.message.toLowerCase();
    if (msg.includes("doc") || msg.includes("readme")) {
      docsScore += 1;
    } else if (
      msg.includes("chore") ||
      msg.includes("ci") ||
      msg.includes("dep") ||
      msg.includes("bump")
    ) {
      maintenanceScore += 1;
    } else {
      generalCodingScore += 1;
    }
  }

  const reviewScore = Math.round(mergedPrs.length * 1.5);
  const issuesScore = issues.length;
  const totalFocusPoints = Math.max(
    1,
    generalCodingScore + reviewScore + issuesScore + docsScore + maintenanceScore,
  );

  const focus = {
    codingPercent: Math.round((generalCodingScore / totalFocusPoints) * 100),
    reviewsPercent: Math.round((reviewScore / totalFocusPoints) * 100),
    issuesPercent: Math.round((issuesScore / totalFocusPoints) * 100),
    docsPercent: Math.round((docsScore / totalFocusPoints) * 100),
    maintenancePercent: Math.round((maintenanceScore / totalFocusPoints) * 100),
  };

  // 4. Cycle time calculations
  let totalPrCycleMs = 0;
  let prCycleCount = 0;
  for (const pr of mergedPrs) {
    if (pr.mergedAt) {
      const created = new Date(pr.createdAt).getTime();
      const merged = new Date(pr.mergedAt).getTime();
      const diff = merged - created;
      if (diff > 0) {
        totalPrCycleMs += diff;
        prCycleCount += 1;
      }
    }
  }
  const avgTimeToMergeMs = prCycleCount > 0 ? Math.round(totalPrCycleMs / prCycleCount) : 0;
  const avgPrCycleTimeMs = avgTimeToMergeMs;

  let totalIssueCycleMs = 0;
  let issueCycleCount = 0;
  for (const issue of closedIssues) {
    if (issue.closedAt) {
      const created = new Date(issue.createdAt).getTime();
      const closed = new Date(issue.closedAt).getTime();
      const diff = closed - created;
      if (diff > 0) {
        totalIssueCycleMs += diff;
        issueCycleCount += 1;
      }
    }
  }
  const avgIssueCycleTimeMs =
    issueCycleCount > 0 ? Math.round(totalIssueCycleMs / issueCycleCount) : 0;

  // 5. Coding metrics
  const commitFrequencyPerDay = Number.parseFloat((commits.length / 14).toFixed(1)); // based on last 14 days
  const prThroughputPerWeek = Number.parseFloat((mergedPrs.length / 2).toFixed(1));
  const issueResolutionRatePercent =
    issues.length > 0 ? Math.round((closedIssues.length / issues.length) * 100) : 100;

  return {
    activity,
    workload,
    focus,
    cycleTime: {
      avgPrCycleTimeMs,
      avgIssueCycleTimeMs,
      avgTimeToMergeMs,
    },
    codingMetrics: {
      commitFrequencyPerDay,
      prThroughputPerWeek,
      issueResolutionRatePercent,
    },
  };
}
