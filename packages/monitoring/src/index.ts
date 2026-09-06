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
    } catch (err: any) {
      isHealthy = false;
      errorMessage = err.message || "Network / connection timeout";
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
        } catch (err) {
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
