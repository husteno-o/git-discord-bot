export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssuesCount: number;
  defaultBranch: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
  license: {
    name: string;
    spdxId: string;
  } | null;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    login?: string;
    date: string;
  };
  htmlUrl: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  author: {
    login: string;
    avatarUrl: string;
  };
  draft: boolean;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  htmlUrl: string;
  createdAt: string;
  closedAt: string | null;
  author: {
    login: string;
    avatarUrl: string;
  };
  commentsCount: number;
  isPullRequest: boolean;
}

export interface GitHubContributor {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
}

export interface GitHubRelease {
  id: number;
  tagName: string;
  name: string;
  publishedAt: string;
  htmlUrl: string;
  body: string;
  prerelease: boolean;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
}

export interface RepoDashboardMetrics {
  activity: {
    commitsCount: number;
    prsOpened: number;
    prsMerged: number;
    issuesOpened: number;
    issuesClosed: number;
    releasesCount: number;
  };
  workload: {
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
    sun: number;
  };
  focus: {
    codingPercent: number;
    reviewsPercent: number;
    issuesPercent: number;
    docsPercent: number;
    maintenancePercent: number;
  };
  cycleTime: {
    avgPrCycleTimeMs: number;
    avgIssueCycleTimeMs: number;
    avgTimeToMergeMs: number;
  };
  codingMetrics: {
    commitFrequencyPerDay: number;
    prThroughputPerWeek: number;
    issueResolutionRatePercent: number;
  };
}
