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
  languages?: Record<string, number>;
  size?: number;
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

export interface GitHubRepoEvent {
  id: string;
  type: string;
  actor: { login: string; avatar_url: string };
  payload: Record<string, unknown>;
  repo: { name: string };
  created_at: string;
}

export interface GitHubWatchEvent {
  eventType: "release" | "pull_request" | "issues" | "public";
  action: string;
  repoFullName: string;
  payload: Record<string, unknown>;
  actor: string;
  timestamp: string;
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

export interface GitHubDetailedPullRequest extends GitHubPullRequest {
  body: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergeable: boolean | null;
  mergeableState: string;
  headBranch: string;
  baseBranch: string;
  reviews: {
    user: string;
    state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING";
    submittedAt?: string;
  }[];
  requestedReviewers: string[];
  ciStatus: "success" | "failure" | "pending" | "unknown";
  cycleTimeMs: number;
  isStale: boolean;
  waitingOn?: string[];
  waitingHours?: number;
}

export interface GitHubCodeSearchResult {
  name: string;
  path: string;
  sha: string;
  htmlUrl: string;
  repository: {
    fullName: string;
    htmlUrl: string;
  };
}

export interface GitHubSearchItem {
  id: number;
  title: string;
  number?: number;
  state?: string;
  htmlUrl: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  commentsCount?: number;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string; // Decoded utf-8 content
  encoding: string;
  htmlUrl: string;
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
    relatedPr?: number;
  };
}

export interface GitHubBlameLine {
  lineNumber: number;
  code: string;
  commitSha: string;
  commitAuthor: string;
  commitDate: string;
  commitMessage: string;
  relatedPrNumber?: number;
}

export interface InvestigationTimelineEvent {
  step: number;
  type:
    | "issue_created"
    | "commit"
    | "pr_opened"
    | "review"
    | "pr_merged"
    | "release"
    | "issue_closed";
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  url?: string;
}

export interface InvestigationTimeline {
  title: string;
  identifier: string;
  summary: string;
  rootCause?: string;
  events: InvestigationTimelineEvent[];
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  htmlUrl: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  headBranch: string;
  headSha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "timed_out"
    | "action_required"
    | null;
  htmlUrl: string;
  runNumber: number;
  event: string;
  createdAt: string;
  updatedAt: string;
  jobs?: {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
  }[];
}

export interface GitHubWorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string;
  completedAt: string | null;
  steps: {
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
  }[];
}

export interface GitHubSecurityAdvisory {
  ghsaId: string;
  cveId: string | null;
  summary: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  package: {
    name: string;
    ecosystem: string;
  };
  vulnerableVersionRange: string;
  patchedVersion: string | null;
  publishedAt: string;
  htmlUrl: string;
}

export interface RepoHealthScore {
  overallScore: number;
  activityScore: number;
  maintenanceScore: number;
  ciScore: number;
  communityScore: number;
  releasesScore: number;
  details: {
    commits30d: number;
    openIssuesRatio: number;
    hasCi: boolean;
    hasLicense: boolean;
    hasReadme: boolean;
    hasContributing: boolean;
    releasesCount: number;
  };
}

export interface RepoDependencies {
  ecosystem: string;
  manifestFile: string;
  dependencies: {
    name: string;
    version: string;
    isDev: boolean;
    isOutdated?: boolean;
    advisoryCount?: number;
  }[];
  totalCount: number;
  outdatedCount: number;
  advisoriesCount: number;
}

export interface RepoGrowthMetrics {
  starsTotal: number;
  starsDelta30d: number;
  forksTotal: number;
  forksDelta30d: number;
  contributorsTotal: number;
  openIssuesDelta30d: number;
  prsMerged30d: number;
}

export interface GitHubPullRequestFile {
  sha: string;
  filename: string;
  status: "added" | "removed" | "modified" | "renamed";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubDetailedIssue extends GitHubIssue {
  body?: string;
  labels: string[];
}
