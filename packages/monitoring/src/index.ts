import { cache } from "@devpulse/cache";
import { NotFoundError, ValidationError } from "@devpulse/core";
import { db, monitorResults, monitors } from "@devpulse/database";
import { inspectSslCertificate, testHttpRequest, validateSafeUrl } from "@devpulse/devtools";
import { logger } from "@devpulse/logger";
import { and, desc, eq } from "drizzle-orm";

export interface MonitorCheckOutcome {
  monitorId: string;
  guildId: string;
  name: string;
  url: string;
  statusCode: number | null;
  responseTimeMs: number;
  isHealthy: boolean;
  sslValid?: boolean;
  sslExpiresAt?: Date;
  statusChanged: boolean;
  errorMessage?: string;
}

export class MonitoringService {
  async addMonitor(
    guildId: string,
    params: {
      name?: string;
      url: string;
      method?: "GET" | "HEAD";
      intervalSeconds?: number;
      expectedStatus?: number;
      sslCheckEnabled?: boolean;
    },
  ) {
    const safeUrl = await validateSafeUrl(params.url);
    const urlStr = safeUrl.toString();
    const name = params.name?.trim() || safeUrl.hostname;

    // Check count limit
    const existing = await db.query.monitors.findMany({
      where: eq(monitors.guildId, guildId),
    });

    if (existing.length >= 20) {
      throw new ValidationError("Maximum limit of 20 monitors reached for this server.");
    }

    const id = crypto.randomUUID();
    const newMonitor = {
      id,
      guildId,
      name,
      url: urlStr,
      method: params.method || "GET",
      intervalSeconds: params.intervalSeconds || 60,
      expectedStatus: params.expectedStatus || 200,
      sslCheckEnabled: params.sslCheckEnabled ?? true,
      isActive: true,
      isHealthy: true,
    };

    await db.insert(monitors).values(newMonitor);

    // Run initial check immediately
    const checkOutcome = await this.checkMonitor(id);

    return {
      id,
      name,
      url: urlStr,
      initialCheck: checkOutcome,
    };
  }

  async listMonitors(guildId: string) {
    return db.query.monitors.findMany({
      where: eq(monitors.guildId, guildId),
      orderBy: [desc(monitors.createdAt)],
    });
  }

  async getMonitorStatus(guildId: string, monitorId: string) {
    const monitor = await db.query.monitors.findFirst({
      where: and(eq(monitors.id, monitorId), eq(monitors.guildId, guildId)),
    });

    if (!monitor) {
      throw new NotFoundError("Monitor", monitorId);
    }

    const history = await db.query.monitorResults.findMany({
      where: eq(monitorResults.monitorId, monitorId),
      orderBy: [desc(monitorResults.checkedAt)],
      limit: 10,
    });

    return {
      monitor,
      history,
    };
  }

  async removeMonitor(guildId: string, monitorId: string) {
    const monitor = await db.query.monitors.findFirst({
      where: and(eq(monitors.id, monitorId), eq(monitors.guildId, guildId)),
    });

    if (!monitor) {
      throw new NotFoundError("Monitor", monitorId);
    }

    await db.delete(monitors).where(eq(monitors.id, monitorId));
    return true;
  }

  async checkMonitor(monitorId: string): Promise<MonitorCheckOutcome> {
    const monitor = await db.query.monitors.findFirst({
      where: eq(monitors.id, monitorId),
    });

    if (!monitor) {
      throw new NotFoundError("Monitor", monitorId);
    }

    const startTime = Date.now();
    let statusCode: number | null = null;
    let isHealthy = false;
    let errorMessage: string | undefined;
    let sslValid: boolean | undefined;
    let sslExpiresAt: Date | undefined;

    try {
      const httpRes = await testHttpRequest(monitor.url, monitor.method as "GET" | "HEAD");
      statusCode = httpRes.statusCode;
      isHealthy = statusCode === monitor.expectedStatus;
      if (!isHealthy) {
        errorMessage = `Expected HTTP ${monitor.expectedStatus}, received HTTP ${statusCode}`;
      }

      if (monitor.sslCheckEnabled && monitor.url.startsWith("https://")) {
        const domain = new URL(monitor.url).hostname;
        const cert = await inspectSslCertificate(domain).catch(() => null);
        if (cert) {
          sslValid = cert.isValid;
          sslExpiresAt = new Date(cert.validTo);
          if (!cert.isValid || cert.daysRemaining < 3) {
            isHealthy = false;
            errorMessage = errorMessage
              ? `${errorMessage} | SSL certificate expired or invalid`
              : `SSL certificate invalid (expires in ${cert.daysRemaining} days)`;
          }
        }
      }
    } catch (err: unknown) {
      isHealthy = false;
      errorMessage =
        (err instanceof Error ? err.message : String(err)) || "Network / connection timeout";
    }

    const responseTimeMs = Date.now() - startTime;
    const previousHealthyState = monitor.isHealthy;
    const statusChanged = previousHealthyState !== isHealthy;

    // Update monitor table
    await db
      .update(monitors)
      .set({
        lastCheckedAt: new Date(Date.now()),
        lastStatus: statusCode,
        lastResponseTimeMs: responseTimeMs,
        lastError: errorMessage || null,
        isHealthy,
        updatedAt: new Date(Date.now()),
      })
      .where(eq(monitors.id, monitorId));

    // Save monitor result
    await db.insert(monitorResults).values({
      id: crypto.randomUUID(),
      monitorId,
      guildId: monitor.guildId,
      statusCode,
      responseTimeMs,
      isHealthy,
      sslValid,
      sslExpiresAt,
      errorMessage: errorMessage || null,
      checkedAt: new Date(Date.now()),
    });

    return {
      monitorId,
      guildId: monitor.guildId,
      name: monitor.name,
      url: monitor.url,
      statusCode,
      responseTimeMs,
      isHealthy,
      sslValid,
      sslExpiresAt,
      statusChanged,
      errorMessage,
    };
  }

  async runScheduledChecks(): Promise<MonitorCheckOutcome[]> {
    const lockAcquired = await cache.acquireLock("scheduler:monitors", 50);
    if (!lockAcquired) {
      logger.debug("Another instance is currently running monitor checks");
      return [];
    }

    try {
      const activeMonitors = await db.query.monitors.findMany({
        where: eq(monitors.isActive, true),
      });

      const now = Date.now();
      const dueMonitors = activeMonitors.filter((m) => {
        if (!m.lastCheckedAt) return true;
        const lastMs = new Date(m.lastCheckedAt).getTime();
        return now - lastMs >= m.intervalSeconds * 1000;
      });

      logger.info({ dueCount: dueMonitors.length }, "Running due monitor checks");
      const outcomes: MonitorCheckOutcome[] = [];

      for (const m of dueMonitors) {
        try {
          const res = await this.checkMonitor(m.id);
          outcomes.push(res);
        } catch (err: unknown) {
          logger.error({ err, monitorId: m.id }, "Error during scheduled monitor check");
        }
      }

      return outcomes;
    } finally {
      await cache.releaseLock("scheduler:monitors");
    }
  }
}

export const monitoringService = new MonitoringService();

class MetricsCollector {
  private commandCounts = new Map<string, { count: number; totalMs: number; errors: number }>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private aiRequests = 0;
  private aiErrors = 0;
  private githubApiCalls = 0;
  private githubApiErrors = 0;
  private startedAt = Date.now();

  recordCommand(name: string, durationMs: number, success: boolean): void {
    const existing = this.commandCounts.get(name) || { count: 0, totalMs: 0, errors: 0 };
    existing.count++;
    existing.totalMs += durationMs;
    if (!success) existing.errors++;
    this.commandCounts.set(name, existing);
  }

  recordCacheHit(): void { this.cacheHits++; }
  recordCacheMiss(): void { this.cacheMisses++; }
  recordAiRequest(): void { this.aiRequests++; }
  recordAiError(): void { this.aiErrors++; }
  recordGithubApiCall(): void { this.githubApiCalls++; }
  recordGithubApiError(): void { this.githubApiErrors++; }

  getSnapshot(): Record<string, unknown> {
    const commands: Record<string, unknown> = {};
    for (const [name, data] of this.commandCounts) {
      commands[name] = {
        total: data.count,
        avgMs: Math.round(data.totalMs / data.count),
        errors: data.errors,
        errorRate: data.count > 0 ? `${((data.errors / data.count) * 100).toFixed(1)}%` : "0%",
      };
    }

    const uptimeMs = Date.now() - this.startedAt;
    return {
      uptimeSeconds: Math.floor(uptimeMs / 1000),
      uptimeHuman: `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m`,
      commands,
      commandSummary: {
        totalCommands: Array.from(this.commandCounts.values()).reduce((s, c) => s + c.count, 0),
        totalErrors: Array.from(this.commandCounts.values()).reduce((s, c) => s + c.errors, 0),
        avgLatencyMs: Math.round(
          Array.from(this.commandCounts.values()).reduce((s, c) => s + c.totalMs, 0) /
            Math.max(Array.from(this.commandCounts.values()).reduce((s, c) => s + c.count, 0), 1),
        ),
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.cacheHits + this.cacheMisses > 0
          ? `${((this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100).toFixed(1)}%`
          : "N/A",
      },
      ai: {
        requests: this.aiRequests,
        errors: this.aiErrors,
        errorRate: this.aiRequests > 0
          ? `${((this.aiErrors / this.aiRequests) * 100).toFixed(1)}%`
          : "0%",
      },
      github: {
        apiCalls: this.githubApiCalls,
        apiErrors: this.githubApiErrors,
      },
    };
  }

  getPrometheusMetrics(): string {
    const lines: string[] = [];
    lines.push("# HELP gitbot_commands_total Total number of commands executed");
    lines.push("# TYPE gitbot_commands_total counter");
    for (const [name, data] of this.commandCounts) {
      lines.push(`gitbot_commands_total{command="${name}"} ${data.count}`);
    }

    lines.push("# HELP gitbot_command_duration_ms Average command duration");
    lines.push("# TYPE gitbot_command_duration_ms gauge");
    for (const [name, data] of this.commandCounts) {
      lines.push(`gitbot_command_duration_ms{command="${name}"} ${Math.round(data.totalMs / data.count)}`);
    }

    lines.push("# HELP gitbot_command_errors_total Total command errors");
    lines.push("# TYPE gitbot_command_errors_total counter");
    for (const [name, data] of this.commandCounts) {
      lines.push(`gitbot_command_errors_total{command="${name}"} ${data.errors}`);
    }

    lines.push(`# HELP gitbot_cache_hits_total Cache hits`);
    lines.push(`# TYPE gitbot_cache_hits_total counter`);
    lines.push(`gitbot_cache_hits_total ${this.cacheHits}`);
    lines.push(`# HELP gitbot_cache_misses_total Cache misses`);
    lines.push(`# TYPE gitbot_cache_misses_total counter`);
    lines.push(`gitbot_cache_misses_total ${this.cacheMisses}`);
    lines.push(`# HELP gitbot_uptime_seconds Uptime in seconds`);
    lines.push(`# TYPE gitbot_uptime_seconds gauge`);
    lines.push(`gitbot_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`);

    return lines.join("\n");
  }
}

export const metricsCollector = new MetricsCollector();
