import { cache, getOrSet } from "@devpulse/cache";
import { config } from "@devpulse/config";
import { logger } from "@devpulse/logger";

export interface TrendingRepo {
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  url: string;
}

export interface TrendingTech {
  name: string;
  category: string;
  growth: string;
  description: string;
}

export interface TrendingProvider {
  name: string;
  getTrendingRepos(language?: string, period?: "today" | "weekly"): Promise<TrendingRepo[]>;
}

export class GitHubApiTrendingProvider implements TrendingProvider {
  name = "GitHub Public API";

  async getTrendingRepos(
    language?: string,
    period: "today" | "weekly" = "today",
  ): Promise<TrendingRepo[]> {
    const daysAgo = period === "today" ? 1 : 7;
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    let query = `created:>${date}`;
    if (language) {
      query += ` language:${language}`;
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DevPulse-Bot/1.0 (+https://github.com/swadhin/discordbot)",
    };
    if (config.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${config.GITHUB_TOKEN}`;
    }

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to search GitHub repositories: ${res.statusText}`);
    }

    const data = (await res.json()) as unknown;
    const items = (data as { items: unknown[] }).items || [];

    return items.map((item: unknown) => ({
      fullName: (item as { full_name: string }).full_name,
      description: (item as { description?: string }).description || "No description provided",
      language: (item as { language?: string }).language || "Unknown",
      stars: (item as { stargazers_count: number }).stargazers_count,
      forks: (item as { forks_count: number }).forks_count,
      url: (item as { html_url: string }).html_url,
    }));
  }
}

export class FallbackTrendingProvider implements TrendingProvider {
  name = "Fallback Static Curated";

  async getTrendingRepos(language?: string): Promise<TrendingRepo[]> {
    const curated: TrendingRepo[] = [
      {
        fullName: "oven-sh/bun",
        description:
          "Incredibly fast JavaScript & TypeScript all-in-one runtime, bundler, test runner, and package manager.",
        language: "Zig",
        stars: 76000,
        forks: 3200,
        url: "https://github.com/oven-sh/bun",
      },
      {
        fullName: "tursodatabase/limbo",
        description:
          "Limbo is a work-in-progress, in-process OLTP database management system, compatible with SQLite.",
        language: "Rust",
        stars: 7500,
        forks: 410,
        url: "https://github.com/tursodatabase/limbo",
      },
      {
        fullName: "astral-sh/uv",
        description: "An extremely fast Python package and project manager, written in Rust.",
        language: "Rust",
        stars: 42000,
        forks: 1500,
        url: "https://github.com/astral-sh/uv",
      },
      {
        fullName: "shadcn-ui/ui",
        description: "Beautifully designed components that you can copy and paste into your apps.",
        language: "TypeScript",
        stars: 74000,
        forks: 6500,
        url: "https://github.com/shadcn-ui/ui",
      },
    ];

    if (language) {
      const filtered = curated.filter((r) => r.language.toLowerCase() === language.toLowerCase());
      if (filtered.length > 0) return filtered;
    }
    return curated;
  }
}

export class TrendingService {
  private providers: TrendingProvider[] = [
    new GitHubApiTrendingProvider(),
    new FallbackTrendingProvider(),
  ];

  async getTrendingRepositories(
    language?: string,
    period: "today" | "weekly" = "today",
  ): Promise<TrendingRepo[]> {
    const cacheKey = `trending:repos:${language || "all"}:${period}`;

    return getOrSet(
      cacheKey,
      async () => {
        for (const p of this.providers) {
          try {
            logger.debug({ provider: p.name }, "Fetching trending repositories");
            const repos = await p.getTrendingRepos(language, period);
            if (repos && repos.length > 0) return repos;
          } catch (err: unknown) {
            logger.warn({ err, provider: p.name }, "Trending provider error, trying next");
          }
        }
        return [];
      },
      1800, // 30 minutes cache
      cache,
    );
  }

  getTrendingTechnologies(): TrendingTech[] {
    return [
      {
        name: "Bun Runtime",
        category: "JavaScript / TypeScript Runtimes",
        growth: "+145% MoM",
        description: "Ultra-fast JS runtime with built-in SQLite, bundler, and native test runner.",
      },
      {
        name: "Turso (libSQL)",
        category: "Databases / Edge",
        growth: "+88% MoM",
        description: "Distributed SQLite engine with embedded replicas and microsecond latency.",
      },
      {
        name: "uv",
        category: "Python Tooling",
        growth: "+210% MoM",
        description: "Rust-powered 10-100x faster drop-in replacement for pip and virtualenv.",
      },
      {
        name: "Drizzle ORM",
        category: "Data Access",
        growth: "+95% MoM",
        description:
          "Zero-overhead TypeScript ORM with maximum type safety and serverless support.",
      },
      {
        name: "Biome",
        category: "Code Quality",
        growth: "+110% MoM",
        description: "High-performance toolchain for web projects replacing ESLint and Prettier.",
      },
    ];
  }
}

export const trendingService = new TrendingService();
