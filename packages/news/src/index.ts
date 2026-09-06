import { cache, getOrSet } from "@devpulse/cache";
import { truncate } from "@devpulse/core";
import { logger } from "@devpulse/logger";

export type NewsCategory =
  | "developer"
  | "programming"
  | "github"
  | "security"
  | "cloud"
  | "ai"
  | "linux"
  | "opensource"
  | "databases"
  | "web"
  | "rust"
  | "go"
  | "python"
  | "typescript"
  | "javascript";

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary: string;
  category: NewsCategory;
}

export interface NewsProvider {
  name: string;
  fetchLatest(category: NewsCategory, limit?: number): Promise<NewsItem[]>;
}

export class AlgoliaHnNewsProvider implements NewsProvider {
  name = "Hacker News Algolia";

  async fetchLatest(category: NewsCategory, limit = 8): Promise<NewsItem[]> {
    const queryMap: Record<NewsCategory, string> = {
      developer: "software engineering",
      programming: "programming",
      github: "github",
      security: "cve vulnerability security exploit",
      cloud: "aws kubernetes cloud devops",
      ai: "llm machine learning artificial intelligence",
      linux: "linux kernel",
      opensource: "open source",
      databases: "postgres database sql sqlite",
      web: "frontend css react web performance",
      rust: "rustlang",
      go: "golang",
      python: "python",
      typescript: "typescript",
      javascript: "javascript",
    };

    const q = encodeURIComponent(queryMap[category] || category);
    const url = `https://hn.algolia.com/api/v1/search_by_date?query=${q}&tags=story&hitsPerPage=${limit}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "DevPulse-Bot/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Algolia HN API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const hits = data.hits || [];

    return hits
      .filter((h: any) => h.title && (h.url || h.story_url))
      .map((h: any) => {
        const itemUrl =
          h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`;
        const domain = (() => {
          try {
            return new URL(itemUrl).hostname.replace(/^www\./, "");
          } catch {
            return "Hacker News";
          }
        })();

        return {
          id: `hn-${h.objectID}`,
          title: h.title,
          url: itemUrl,
          source: domain,
          publishedAt: h.created_at || new Date().toISOString(),
          summary: truncate(
            h.story_text ||
              `Discussion with ${h.points || 0} points and ${h.num_comments || 0} comments on ${domain}.`,
            200,
          ),
          category,
        };
      });
  }
}

export class DevToNewsProvider implements NewsProvider {
  name = "Dev.to";

  async fetchLatest(category: NewsCategory, limit = 8): Promise<NewsItem[]> {
    const tagMap: Record<NewsCategory, string> = {
      developer: "development",
      programming: "programming",
      github: "github",
      security: "security",
      cloud: "devops",
      ai: "ai",
      linux: "linux",
      opensource: "opensource",
      databases: "database",
      web: "webdev",
      rust: "rust",
      go: "go",
      python: "python",
      typescript: "typescript",
      javascript: "javascript",
    };

    const tag = tagMap[category] || "development";
    const url = `https://dev.to/api/articles?tag=${tag}&per_page=${limit}`;

    const response = await fetch(url, {
      headers: { "User-Agent": "DevPulse-Bot/1.0" },
    });

    if (!response.ok) {
      throw new Error(`Dev.to API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any[];

    return data.map((art) => ({
      id: `devto-${art.id}`,
      title: art.title,
      url: art.url,
      source: "Dev.to",
      publishedAt: art.published_at || new Date().toISOString(),
      summary: truncate(art.description || "Article on Dev.to", 200),
      category,
    }));
  }
}

export class NewsService {
  private providers: NewsProvider[] = [new AlgoliaHnNewsProvider(), new DevToNewsProvider()];

  async getLatestNews(category: NewsCategory = "developer", limit = 6): Promise<NewsItem[]> {
    const cacheKey = `news:${category}:${limit}`;

    return getOrSet(
      cacheKey,
      async () => {
        for (const provider of this.providers) {
          try {
            logger.debug({ provider: provider.name, category }, "Fetching news from provider");
            const items = await provider.fetchLatest(category, limit);
            if (items && items.length > 0) {
              return items;
            }
          } catch (err) {
            logger.warn(
              { err, provider: provider.name },
              "News provider failed, trying next provider",
            );
          }
        }
        return [];
      },
      900, // 15 minute cache
      cache,
    );
  }
}

export const newsService = new NewsService();
