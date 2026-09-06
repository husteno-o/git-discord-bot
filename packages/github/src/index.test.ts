import { describe, expect, it } from "vitest";
import { computeRepoDashboardMetrics } from "./analytics.js";
import type { GitHubCommit, GitHubIssue, GitHubPullRequest, GitHubRelease } from "./types.js";

describe("GitHub metrics computation", () => {
  it("calculates accurate activity, focus, and cycle time", () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const mockCommits: GitHubCommit[] = [
      {
        sha: "abc1",
        message: "feat: add discord buttons",
        author: { name: "Alice", date: new Date(now - oneDay).toISOString() },
        htmlUrl: "https://github.com",
      },
      {
        sha: "abc2",
        message: "docs: update readme with setup guide",
        author: { name: "Alice", date: new Date(now - 2 * oneDay).toISOString() },
        htmlUrl: "https://github.com",
      },
      {
        sha: "abc3",
        message: "chore: bump dependencies",
        author: { name: "Bob", date: new Date(now - 3 * oneDay).toISOString() },
        htmlUrl: "https://github.com",
      },
    ];

    const mockPrs: GitHubPullRequest[] = [
      {
        id: 1,
        number: 101,
        title: "Feature A",
        state: "closed",
        htmlUrl: "https://github.com",
        createdAt: new Date(now - 2 * oneDay).toISOString(),
        updatedAt: new Date(now - oneDay).toISOString(),
        closedAt: new Date(now - oneDay).toISOString(),
        mergedAt: new Date(now - oneDay).toISOString(), // Merged in 1 day
        author: { login: "Alice", avatarUrl: "" },
        draft: false,
      },
    ];

    const mockIssues: GitHubIssue[] = [
      {
        id: 1,
        number: 50,
        title: "Bug in cache layer",
        state: "closed",
        htmlUrl: "https://github.com",
        createdAt: new Date(now - 3 * oneDay).toISOString(),
        closedAt: new Date(now - oneDay).toISOString(), // Closed in 2 days
        author: { login: "Charlie", avatarUrl: "" },
        commentsCount: 3,
        isPullRequest: false,
      },
    ];

    const mockReleases: GitHubRelease[] = [
      {
        id: 1,
        tagName: "v1.0.0",
        name: "Initial Release",
        publishedAt: new Date(now - 5 * oneDay).toISOString(),
        htmlUrl: "https://github.com",
        body: "Release notes",
        prerelease: false,
      },
    ];

    const metrics = computeRepoDashboardMetrics(mockCommits, mockPrs, mockIssues, mockReleases);

    expect(metrics.activity.commitsCount).toBe(3);
    expect(metrics.activity.prsMerged).toBe(1);
    expect(metrics.activity.issuesClosed).toBe(1);
    expect(metrics.activity.releasesCount).toBe(1);

    // Verify cycle time calculations
    expect(metrics.cycleTime.avgTimeToMergeMs).toBeGreaterThan(0);
    expect(metrics.cycleTime.avgTimeToMergeMs).toBeLessThanOrEqual(oneDay + 1000);
    expect(metrics.cycleTime.avgIssueCycleTimeMs).toBeGreaterThan(0);

    // Verify focus breakdown percentages sum roughly to 100
    const totalFocus =
      metrics.focus.codingPercent +
      metrics.focus.reviewsPercent +
      metrics.focus.issuesPercent +
      metrics.focus.docsPercent +
      metrics.focus.maintenancePercent;
    expect(totalFocus).toBeGreaterThanOrEqual(95);
    expect(totalFocus).toBeLessThanOrEqual(105);
  });
});
