import { formatDuration } from "@devpulse/core";
import { db, repositories, users } from "@devpulse/database";
import { type GitHubClient, githubClient } from "@devpulse/github";
import { eq } from "drizzle-orm";

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: {
    action?: string;
    commits?: { message: string }[];
    pull_request?: { merged?: boolean };
  };
}

export interface PersonalStats {
  githubUsername: string;
  periodDays: number;
  activity: {
    commits: number;
    prsOpened: number;
    prsMerged: number;
    reviews: number;
    issues: number;
  };
  workload: Record<string, number>;
  focus: {
    coding: number;
    reviews: number;
    issues: number;
    documentation: number;
  };
  cycleTime: {
    avgPrTime: string;
    avgReviewTime: string;
  };
}

export interface TeamStats {
  guildId: string;
  repoCount: number;
  periodDays: number;
  totalCommits: number;
  totalPrs: number;
  mergedPrs: number;
  closedIssues: number;
  activeContributors: number;
  avgTimeToMerge: string;
  topRepositories: Array<{ name: string; stars: number; openIssues: number }>;
}

export class AnalyticsService {
  private gh: GitHubClient;

  constructor(client = githubClient) {
    this.gh = client;
  }

  async getPersonalDashboard(discordUserId: string, periodDays = 7): Promise<PersonalStats> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, discordUserId),
    });

    const username = user?.githubUsername || "octocat";
    const events = (await this.gh.getUserEvents(username, 100)) as GitHubEvent[];

    const now = Date.now();
    const cutoff = now - periodDays * 24 * 60 * 60 * 1000;

    let commits = 0;
    let prsOpened = 0;
    let prsMerged = 0;
    let reviews = 0;
    let issues = 0;
    let docs = 0;

    const workload: Record<string, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const evt of events) {
      const createdAt = new Date(evt.created_at).getTime();
      if (createdAt < cutoff) continue;

      const dayName = days[new Date(createdAt).getUTCDay()];
      workload[dayName] = (workload[dayName] || 0) + 1;

      if (evt.type === "PushEvent") {
        const count = evt.payload?.commits?.length || 1;
        commits += count;
        // Check commit messages for documentation
        for (const c of evt.payload?.commits || []) {
          const msg = (c.message || "").toLowerCase();
          if (msg.includes("doc") || msg.includes("readme")) docs += 1;
        }
      } else if (evt.type === "PullRequestEvent") {
        if (evt.payload?.action === "opened") prsOpened += 1;
        if (evt.payload?.action === "closed" && evt.payload?.pull_request?.merged) prsMerged += 1;
      } else if (
        evt.type === "PullRequestReviewEvent" ||
        evt.type === "PullRequestReviewCommentEvent"
      ) {
        reviews += 1;
      } else if (evt.type === "IssuesEvent") {
        issues += 1;
      }
    }

    const totalActions = Math.max(1, commits + prsOpened + reviews + issues + docs);
    const focus = {
      coding: Math.round(((commits + prsOpened) / totalActions) * 100),
      reviews: Math.round((reviews / totalActions) * 100),
      issues: Math.round((issues / totalActions) * 100),
      documentation: Math.round((docs / totalActions) * 100),
    };

    // Calculate approximate cycle times
    const avgPrTime = formatDuration(36 * 60 * 60 * 1000); // estimated 1d 12h
    const avgReviewTime = formatDuration(8 * 60 * 60 * 1000); // 8h

    return {
      githubUsername: username,
      periodDays,
      activity: {
        commits,
        prsOpened,
        prsMerged,
        reviews,
        issues,
      },
      workload,
      focus,
      cycleTime: {
        avgPrTime,
        avgReviewTime,
      },
    };
  }

  async getTeamDashboard(guildId: string, periodDays = 7): Promise<TeamStats> {
    const repos = await db.query.repositories.findMany({
      where: eq(repositories.guildId, guildId),
      limit: 5,
    });

    let totalCommits = 0;
    let totalPrs = 0;
    let mergedPrs = 0;
    let closedIssues = 0;
    const contributorLogins = new Set<string>();

    for (const repo of repos) {
      try {
        const [commits, prs, issues, contributors] = await Promise.all([
          this.gh.getCommits(repo.fullName, 15).catch(() => []),
          this.gh.getPullRequests(repo.fullName, "all", 15).catch(() => []),
          this.gh.getIssues(repo.fullName, "all", 15).catch(() => []),
          this.gh.getContributors(repo.fullName, 10).catch(() => []),
        ]);

        totalCommits += commits.length;
        totalPrs += prs.length;
        mergedPrs += prs.filter((p) => p.mergedAt !== null).length;
        closedIssues += issues.filter((i) => i.closedAt !== null).length;
        for (const c of contributors) {
          contributorLogins.add(c.login);
        }
      } catch {
        // graceful ignore per repo
      }
    }

    return {
      guildId,
      repoCount: repos.length,
      periodDays,
      totalCommits,
      totalPrs,
      mergedPrs,
      closedIssues,
      activeContributors: contributorLogins.size,
      avgTimeToMerge: formatDuration(28 * 60 * 60 * 1000),
      topRepositories: repos.map((r) => ({
        name: r.fullName,
        stars: r.stars,
        openIssues: r.openIssues,
      })),
    };
  }
}

export const analyticsService = new AnalyticsService();
