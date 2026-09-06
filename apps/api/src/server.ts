import { cache } from "@devpulse/cache";
import { formatBytes } from "@devpulse/core";
import { db } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";

export interface ServerOptions {
  discordClient?: {
    isReady?: () => boolean;
    ws?: { ping?: number };
    guilds?: { cache?: { size: number } };
    user?: { tag?: string } | null;
  };
}

export function buildServer(options?: ServerOptions): FastifyInstance {
  const server = Fastify({
    loggerInstance: logger as any,
  });

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
    } catch (err: any) {
      logger.error({ err }, "Readiness check failed");
      return reply.status(503).send({
        status: "unready",
        error: err.message,
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
    };
  });

  return server;
}
