import type {
  GitHubDetailedIssue,
  GitHubDetailedPullRequest,
  GitHubPullRequestFile,
  GitHubRepo,
} from "@devpulse/github";
import { describe, expect, it } from "vitest";
import { aiCopilotService } from "./copilot.js";

describe("AI Copilot & Code Intelligence Engine", () => {
  const dummyRepo: GitHubRepo = {
    id: 1,
    name: "warren",
    fullName: "swadhinbiswas/warren",
    owner: { login: "swadhinbiswas", avatarUrl: "" },
    description: "Financial analytics platform",
    htmlUrl: "https://github.com/swadhinbiswas/warren",
    language: "TypeScript",
    stars: 150,
    forks: 20,
    openIssuesCount: 3,
    defaultBranch: "main",
    isPrivate: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    pushedAt: "2026-09-06T00:00:00Z",
    topics: ["finance", "analytics"],
    license: { name: "MIT", spdxId: "MIT" },
  };

  it("performs automated code reviews and spots critical vulnerabilities", async () => {
    const pr: GitHubDetailedPullRequest = {
      id: 101,
      number: 12,
      title: "Add authentication token caching",
      body: "Implements token caching with auth tokens in localStorage and memory.",
      state: "open",
      htmlUrl: "https://github.com/swadhinbiswas/warren/pull/12",
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-02T00:00:00Z",
      closedAt: null,
      mergedAt: null,
      author: { login: "dev-user", avatarUrl: "" },
      draft: false,
      additions: 25,
      deletions: 5,
      changedFiles: 2,
      mergeable: true,
      mergeableState: "clean",
      headBranch: "feat/auth-cache",
      baseBranch: "main",
      reviews: [],
      requestedReviewers: [],
      ciStatus: "success",
      cycleTimeMs: 3600000,
      isStale: false,
      waitingHours: 10,
    };

    const files: GitHubPullRequestFile[] = [
      {
        sha: "abc123",
        filename: "src/auth.ts",
        status: "modified",
        additions: 15,
        deletions: 2,
        changes: 17,
        patch: `@@ -10,5 +10,8 @@\n+  const secret = "ghp_1234567890abcdef";\n+  eval(userCode);\n+  console.log("Token verified");`,
      },
    ];

    const review = await aiCopilotService.reviewPullRequest("swadhinbiswas/warren", pr, files);

    expect(review).toBeDefined();
    expect(review.riskLevel).toBe("CRITICAL");
    expect(review.score).toBeLessThan(60);
    expect(review.approvedForMerge).toBe(false);
    expect(review.findings.some((f) => f.category === "security")).toBe(true);
  });

  it("generates executive standup changelog summaries", async () => {
    const commits = [
      {
        sha: "1111111",
        message: "feat(analytics): add real-time revenue dashboard",
        author: { name: "Alice", date: "2026-09-05T00:00:00Z" },
        htmlUrl: "https://github.com/swadhinbiswas/warren/commit/111",
      },
      {
        sha: "2222222",
        message: "fix(auth): handle session expiration edge cases",
        author: { name: "Bob", date: "2026-09-06T00:00:00Z" },
        htmlUrl: "https://github.com/swadhinbiswas/warren/commit/222",
      },
    ];

    const prs = [
      {
        id: 201,
        number: 14,
        title: "feat(analytics): revenue dashboard",
        state: "closed" as const,
        htmlUrl: "https://github.com/swadhinbiswas/warren/pull/14",
        createdAt: "2026-09-04T00:00:00Z",
        updatedAt: "2026-09-05T00:00:00Z",
        closedAt: "2026-09-05T12:00:00Z",
        mergedAt: "2026-09-05T12:00:00Z",
        author: { login: "Alice", avatarUrl: "" },
        draft: false,
      },
    ];

    const summary = await aiCopilotService.summarizeActivity(dummyRepo, commits, prs, "week");

    expect(summary.timeframe).toBe("week");
    expect(summary.features.length).toBeGreaterThan(0);
    expect(summary.fixes.length).toBeGreaterThan(0);
    expect(summary.stats.commitsCount).toBe(2);
    expect(summary.stats.activeAuthorsCount).toBe(2);
  });

  it("investigates issue stack traces and proposes concrete bugfix patches", async () => {
    const issue: GitHubDetailedIssue = {
      id: 301,
      number: 42,
      title: "TypeError: Cannot read properties of undefined (reading 'token')",
      state: "open",
      htmlUrl: "https://github.com/swadhinbiswas/warren/issues/42",
      createdAt: "2026-09-05T00:00:00Z",
      closedAt: null,
      author: { login: "charlie", avatarUrl: "" },
      commentsCount: 1,
      isPullRequest: false,
      labels: ["bug"],
      body: `Error occurred during login flow:\nTypeError: Cannot read properties of undefined (reading 'token')\n    at authenticate (src/auth/session.ts:45:12)\n    at handleRequest (src/server.ts:102:5)`,
    };

    const fix = await aiCopilotService.suggestBugfix("swadhinbiswas/warren", issue);

    expect(fix.targetFile).toBe("src/auth/session.ts");
    expect(fix.targetLine).toBe(45);
    expect(fix.proposedPatch).toContain("--- a/src/auth/session.ts");
    expect(fix.proposedPatch).toContain("+++ b/src/auth/session.ts");
    expect(fix.testSuggestions.length).toBeGreaterThan(0);
  });

  it("explains code architecture, dependencies, and complexity", async () => {
    const code = `import { logger } from "@devpulse/logger";
import { config } from "@devpulse/config";

export class SecurityGuard {
  private allowedDomains: string[];

  constructor() {
    this.allowedDomains = ["api.github.com"];
  }

  export async function validateEndpoint(url: string): Promise<boolean> {
    logger.info({ url }, "Validating security endpoint");
    return true;
  }
}`;

    const explanation = await aiCopilotService.explainCode(
      "swadhinbiswas/warren",
      "src/security/guard.ts",
      code,
      10,
    );

    expect(explanation.architectureRole).toContain("Security");
    expect(explanation.complexity).toBe("Low");
    expect(explanation.dependencies).toContain("@devpulse/logger");
    expect(explanation.keyComponents.length).toBeGreaterThan(0);
  });
});
