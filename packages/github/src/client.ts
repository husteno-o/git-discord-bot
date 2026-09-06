import { cache, getOrSet } from "@devpulse/cache";
import { config } from "@devpulse/config";
import {
  ExternalServiceError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@devpulse/core";
import { logger } from "@devpulse/logger";
import type {
  GitHubCommit,
  GitHubContributor,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRelease,
  GitHubRepo,
  GitHubUser,
} from "./types.js";

export class GitHubClient {
  private token?: string;

  constructor(token = config.GITHUB_TOKEN) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DevPulse-Bot/1.0 (+https://github.com/swadhin/discordbot)",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  private parseRepoInput(repoInput: string): { owner: string; repo: string } {
    const clean = repoInput
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\.git$/i, "")
      .trim();
    const parts = clean.split("/").filter(Boolean);
    if (parts.length !== 2) {
      throw new ValidationError(
        `Invalid repository format '${repoInput}'. Use 'owner/repo' format.`,
      );
    }
    return { owner: parts[0], repo: parts[1] };
  }

  private async request<T>(endpoint: string): Promise<T> {
    const url = `https://api.github.com${endpoint}`;
    logger.debug({ endpoint }, "Executing GitHub API request");

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (response.status === 404) {
      throw new NotFoundError("GitHub resource", endpoint);
    }

    if (response.status === 403 || response.status === 429) {
      const reset = response.headers.get("x-ratelimit-reset");
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0" && reset) {
        const resetTime = Number.parseInt(reset, 10) * 1000;
        const waitSec = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
        throw new RateLimitError(
          waitSec,
          `GitHub API rate limit exceeded. Try again in ${waitSec}s.`,
        );
      }
      throw new ExternalServiceError("GitHub", "Access forbidden or rate limited.");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new ExternalServiceError(
        "GitHub",
        `Request failed with status ${response.status}: ${text}`,
      );
    }

    return (await response.json()) as T;
  }

  async getRepo(repoInput: string): Promise<GitHubRepo> {
    const { owner, repo } = this.parseRepoInput(repoInput);
    const cacheKey = `gh:repo:${owner.toLowerCase()}:${repo.toLowerCase()}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any>(`/repos/${owner}/${repo}`);
        return {
          id: raw.id,
          name: raw.name,
          fullName: raw.full_name,
          owner: {
            login: raw.owner.login,
            avatarUrl: raw.owner.avatar_url,
          },
          description: raw.description,
          htmlUrl: raw.html_url,
          language: raw.language,
          stars: raw.stargazers_count,
          forks: raw.forks_count,
          openIssuesCount: raw.open_issues_count,
          defaultBranch: raw.default_branch,
          isPrivate: raw.private,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at,
          pushedAt: raw.pushed_at,
          topics: raw.topics || [],
          license: raw.license ? { name: raw.license.name, spdxId: raw.license.spdx_id } : null,
        };
      },
      300,
      cache,
    );
  }

  async getCommits(repoInput: string, limit = 30): Promise<GitHubCommit[]> {
    const { owner, repo } = this.parseRepoInput(repoInput);
    const cacheKey = `gh:commits:${owner.toLowerCase()}:${repo.toLowerCase()}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any[]>(`/repos/${owner}/${repo}/commits?per_page=${limit}`);
        return raw.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          author: {
            name: c.commit.author?.name || "Unknown",
            login: c.author?.login,
            date: c.commit.author?.date || new Date().toISOString(),
          },
          htmlUrl: c.html_url,
        }));
      },
      300,
      cache,
    );
  }

  async getPullRequests(
    repoInput: string,
    state: "open" | "closed" | "all" = "all",
    limit = 30,
  ): Promise<GitHubPullRequest[]> {
    const { owner, repo } = this.parseRepoInput(repoInput);
    const cacheKey = `gh:prs:${owner.toLowerCase()}:${repo.toLowerCase()}:${state}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any[]>(
          `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${limit}&sort=updated&direction=desc`,
        );
        return raw.map((pr) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          htmlUrl: pr.html_url,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          closedAt: pr.closed_at,
          mergedAt: pr.merged_at,
          author: {
            login: pr.user?.login || "ghost",
            avatarUrl: pr.user?.avatar_url || "",
          },
          draft: pr.draft || false,
        }));
      },
      300,
      cache,
    );
  }

  async getIssues(
    repoInput: string,
    state: "open" | "closed" | "all" = "all",
    limit = 30,
  ): Promise<GitHubIssue[]> {
    const { owner, repo } = this.parseRepoInput(repoInput);
    const cacheKey = `gh:issues:${owner.toLowerCase()}:${repo.toLowerCase()}:${state}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any[]>(
          `/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}&sort=updated&direction=desc`,
        );
        return raw
          .filter((item) => !item.pull_request) // filter out pull requests
          .map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state,
            htmlUrl: issue.html_url,
            createdAt: issue.created_at,
            closedAt: issue.closed_at,
            author: {
              login: issue.user?.login || "ghost",
              avatarUrl: issue.user?.avatar_url || "",
            },
            commentsCount: issue.comments || 0,
            isPullRequest: false,
          }));
      },
      300,
      cache,
    );
  }

  async getContributors(repoInput: string, limit = 15): Promise<GitHubContributor[]> {
    const { owner, repo } = this.parseRepoInput(repoInput);
    const cacheKey = `gh:contributors:${owner.toLowerCase()}:${repo.toLowerCase()}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any[]>(
          `/repos/${owner}/${repo}/contributors?per_page=${limit}`,
        );
        return raw.map((c) => ({
          login: c.login,
          avatarUrl: c.avatar_url,
          htmlUrl: c.html_url,
          contributions: c.contributions,
        }));
      },
      1800,
      cache,
    );
  }

  async getReleases(repoInput: string, limit = 10): Promise<GitHubRelease[]> {
    const { owner, repo } = this.parseRepoInput(repoInput);
    const cacheKey = `gh:releases:${owner.toLowerCase()}:${repo.toLowerCase()}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any[]>(`/repos/${owner}/${repo}/releases?per_page=${limit}`);
        return raw.map((r) => ({
          id: r.id,
          tagName: r.tag_name,
          name: r.name || r.tag_name,
          publishedAt: r.published_at,
          htmlUrl: r.html_url,
          body: r.body || "",
          prerelease: r.prerelease || false,
        }));
      },
      1800,
      cache,
    );
  }

  async getUser(username: string): Promise<GitHubUser> {
    const cleanUser = username.replace(/^@/, "").trim();
    const cacheKey = `gh:user:${cleanUser.toLowerCase()}`;

    return getOrSet(
      cacheKey,
      async () => {
        const raw = await this.request<any>(`/users/${cleanUser}`);
        return {
          login: raw.login,
          name: raw.name,
          avatarUrl: raw.avatar_url,
          htmlUrl: raw.html_url,
          bio: raw.bio,
          publicRepos: raw.public_repos,
          followers: raw.followers,
          following: raw.following,
          createdAt: raw.created_at,
        };
      },
      600,
      cache,
    );
  }

  async getUserEvents(username: string, limit = 50): Promise<any[]> {
    const cleanUser = username.replace(/^@/, "").trim();
    const cacheKey = `gh:events:${cleanUser.toLowerCase()}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        return this.request<any[]>(`/users/${cleanUser}/events?per_page=${limit}`);
      },
      300,
      cache,
    );
  }
}

export const githubClient = new GitHubClient();
