import { cache } from "@devpulse/cache";
import { config } from "@devpulse/config";
import { formatBytes } from "@devpulse/core";
import { db, users } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { metricsCollector } from "@devpulse/monitoring";
import { encryptSecret } from "@devpulse/security";
import { eq, sql } from "drizzle-orm";
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 100;

async function rateLimitHook(
  req: { ip: string },
  reply: { status: (code: number) => { send: (body: unknown) => void } },
) {
  const key = `ratelimit:api:${req.ip}`;
  const result = await cache.checkRateLimit(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
  if (!result.allowed) {
    reply.status(429).send({
      error: "Too Many Requests",
      retryAfter: result.resetSeconds,
    });
  }
}

export interface ServerOptions {
  discordClient?: {
    isReady?: () => boolean;
    ws?: { ping?: number };
    guilds?: { cache?: { size: number } };
    user?: { tag?: string } | null;
  };
}

/**
 * Builds and configures the Fastify HTTP server with health, readiness,
 * metrics, and GitHub OAuth endpoints. Includes rate limiting.
 */
export function buildServer(options?: ServerOptions): FastifyInstance {
  const server = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
  });

  server.addHook("onRequest", rateLimitHook);

  server.get("/health", async () => {
    const memory = process.memoryUsage();
    const discordStatus = options?.discordClient
      ? {
          connected: options.discordClient.isReady ? options.discordClient.isReady() : false,
          pingMs: options.discordClient.ws?.ping ?? -1,
          guildsCount: options.discordClient.guilds?.cache?.size ?? 0,
          user: options.discordClient.user?.tag ?? null,
        }
      : undefined;

    return {
      status: "healthy",
      service: "DevPulse API",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      ...(discordStatus ? { discord: discordStatus } : {}),
      memory: {
        rss: formatBytes(memory.rss),
        heapUsed: formatBytes(memory.heapUsed),
        heapTotal: formatBytes(memory.heapTotal),
      },
    };
  });

  server.get("/ready", async (_req, reply) => {
    try {
      // Test DB
      await db.run(sql`SELECT 1`);

      // Test Cache
      await cache.set("devpulse:readiness-probe", "ok", 10);
      const cacheVal = await cache.get<string>("devpulse:readiness-probe");
      if (cacheVal !== "ok") {
        return reply.status(503).send({ status: "degraded", reason: "Cache read failure" });
      }

      return {
        status: "ready",
        database: "connected",
        cache: "connected",
        ...(options?.discordClient
          ? { discord: options.discordClient.isReady?.() ? "connected" : "connecting" }
          : {}),
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      logger.error({ err }, "Readiness check failed");
      return reply.status(503).send({
        status: "unready",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  server.get("/metrics", async () => {
    const allServers = await db.query.servers.findMany();
    const allRepos = await db.query.repositories.findMany();
    const allMonitors = await db.query.monitors.findMany();

    return {
      serversCount: allServers.length,
      repositoriesTracked: allRepos.length,
      monitorsActive: allMonitors.filter((m) => m.isActive).length,
      monitorsTotal: allMonitors.length,
      ...(options?.discordClient?.guilds?.cache
        ? { discordGuilds: options.discordClient.guilds.cache.size }
        : {}),
      nodeVersion: process.version,
      platform: process.platform,
      detailed: metricsCollector.getSnapshot(),
    };
  });

  server.get("/metrics/prometheus", async (_req, reply) => {
    reply.header("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    return metricsCollector.getPrometheusMetrics();
  });

  // --------------------------------------------------------------------------
  // GitHub OAuth Endpoints
  // --------------------------------------------------------------------------
  server.get("/auth/github/login", async (req, reply) => {
    const { userId } = req.query as { userId?: string };
    if (!config.GITHUB_CLIENT_ID) {
      return reply
        .status(500)
        .type("text/html")
        .send("<h1>Error: GITHUB_CLIENT_ID is not configured in .env</h1>");
    }

    const redirectUri =
      config.GITHUB_REDIRECT_URI ||
      `${req.protocol}://${req.headers.host || req.hostname}/auth/github/callback`;
    const state = userId || "anonymous";
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      config.GITHUB_CLIENT_ID,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user&state=${encodeURIComponent(state)}`;

    return reply.redirect(githubAuthUrl);
  });

  server.get("/auth/github/callback", async (req, reply) => {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code) {
      return reply
        .status(400)
        .type("text/html")
        .send("<h1>Error: Missing authorization code from GitHub</h1>");
    }

    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
      return reply
        .status(500)
        .type("text/html")
        .send("<h1>Error: GitHub OAuth credentials not configured on server</h1>");
    }

    try {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: config.GITHUB_CLIENT_ID,
          client_secret: config.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = (await tokenRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenData.access_token) {
        return reply
          .status(400)
          .type("text/html")
          .send(
            `<h1>Authentication Failed</h1><p>${tokenData.error_description || "Could not retrieve access token."}</p>`,
          );
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "DevPulse-Discord-Bot",
        },
      });

      const ghUser = (await userRes.json()) as { login: string; id: number };
      const encrypted = encryptSecret(tokenData.access_token);
      const discordUserId = state && state !== "anonymous" ? state : null;

      if (discordUserId) {
        const existing = await db.query.users.findFirst({
          where: eq(users.id, discordUserId),
        });

        if (existing) {
          await db
            .update(users)
            .set({
              githubUsername: ghUser.login,
              githubTokenEncrypted: encrypted,
              updatedAt: new Date(),
            })
            .where(eq(users.id, discordUserId));
        } else {
          await db.insert(users).values({
            id: discordUserId,
            username: ghUser.login,
            githubUsername: ghUser.login,
            githubTokenEncrypted: encrypted,
          });
        }
      }

      return reply.type("text/html").send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DevPulse - Connected</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #f0f6fc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 40px; text-align: center; max-width: 440px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
            h1 { color: #3fb950; font-size: 1.5rem; margin-bottom: 12px; }
            p { color: #8b949e; line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem; }
            .badge { display: inline-block; background: rgba(56,139,253,0.15); color: #58a6ff; border: 1px solid rgba(56,139,253,0.4); padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 0.9rem; margin-bottom: 20px; }
            .footer { font-size: 0.8rem; color: #6e7681; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>GitHub Connected</h1>
            <div class="badge">@${ghUser.login}</div>
            <p>Your GitHub account has been securely linked and encrypted with AES-256-GCM. You can now close this tab and return to Discord!</p>
            <div class="footer">DevPulse Developer Operating System</div>
          </div>
        </body>
        </html>
      `);
    } catch (err: unknown) {
      logger.error({ err }, "GitHub OAuth exchange failed");
      return reply
        .status(500)
        .type("text/html")
        .send(
          `<h1>Internal Server Error</h1><p>${err instanceof Error ? err.message : String(err)}</p>`,
        );
    }
  });

  return server;
}
