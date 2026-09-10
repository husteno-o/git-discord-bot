import { cache } from "@devpulse/cache";
import { NotFoundError } from "@devpulse/core";
import { db, gitHubEvents, notifications, reminders } from "@devpulse/database";
import { githubClient } from "@devpulse/github";
import { logger } from "@devpulse/logger";
import { type MonitorCheckOutcome, monitoringService } from "@devpulse/monitoring";
import cronParser from "cron-parser";
import { and, desc, eq, lte } from "drizzle-orm";
import type { GitHubRepoEvent } from "@devpulse/github";

export interface DependencyAlert {
  repoFullName: string;
  totalCount: number;
  outdatedCount: number;
  outdatedPackages: string[];
}

export interface DueReminder {
  id: string;
  guildId: string;
  channelId: string;
  userId: string;
  message: string;
  dueAt: Date;
  isRecurring: boolean;
  cronExpression?: string | null;
}

export class ReminderService {
  async addReminder(
    guildId: string,
    channelId: string,
    userId: string,
    message: string,
    dueAt: Date,
    cronExpression?: string,
  ) {
    const id = crypto.randomUUID();
    const isRecurring = Boolean(cronExpression);

    await db.insert(reminders).values({
      id,
      guildId,
      channelId,
      userId,
      message,
      dueAt,
      isRecurring,
      cronExpression: cronExpression || null,
      isCompleted: false,
    });

    return { id, dueAt, isRecurring, cronExpression };
  }

  async listReminders(guildId: string, userId?: string) {
    if (userId) {
      return db.query.reminders.findMany({
        where: and(
          eq(reminders.guildId, guildId),
          eq(reminders.userId, userId),
          eq(reminders.isCompleted, false),
        ),
        orderBy: [desc(reminders.dueAt)],
      });
    }

    return db.query.reminders.findMany({
      where: and(eq(reminders.guildId, guildId), eq(reminders.isCompleted, false)),
      orderBy: [desc(reminders.dueAt)],
    });
  }

  async cancelReminder(guildId: string, reminderId: string) {
    const reminder = await db.query.reminders.findFirst({
      where: and(eq(reminders.id, reminderId), eq(reminders.guildId, guildId)),
    });

    if (!reminder) {
      throw new NotFoundError("Reminder", reminderId);
    }

    await db.delete(reminders).where(eq(reminders.id, reminderId));
    return true;
  }

  async getDueReminders(): Promise<DueReminder[]> {
    const now = new Date(Date.now());
    const due = await db.query.reminders.findMany({
      where: and(lte(reminders.dueAt, now), eq(reminders.isCompleted, false)),
      limit: 25,
    });

    return due.map((r) => ({
      id: r.id,
      guildId: r.guildId,
      channelId: r.channelId,
      userId: r.userId,
      message: r.message,
      dueAt: r.dueAt,
      isRecurring: r.isRecurring,
      cronExpression: r.cronExpression,
    }));
  }

  async processReminderCompletion(reminder: DueReminder) {
    if (reminder.isRecurring && reminder.cronExpression) {
      try {
        interface CronParserModule {
          parseExpression: (expr: string) => { next: () => { toDate: () => Date } };
          default?: { parseExpression: (expr: string) => { next: () => { toDate: () => Date } } };
        }
        const mod = cronParser as CronParserModule;
        const parseFn = mod.parseExpression || mod.default?.parseExpression;
        const interval = parseFn(reminder.cronExpression);
        const nextDue = interval.next().toDate();
        await db.update(reminders).set({ dueAt: nextDue }).where(eq(reminders.id, reminder.id));
        return;
      } catch (err: unknown) {
        logger.error(
          { err, reminderId: reminder.id },
          "Failed to calculate next recurring cron time",
        );
      }
    }

    await db.update(reminders).set({ isCompleted: true }).where(eq(reminders.id, reminder.id));
  }
}

export const reminderService = new ReminderService();

export interface WatchNotificationEvent {
  repoFullName: string;
  eventType: "release" | "pull_request" | "security_alert";
  actor: string;
  actorAvatar: string;
  payload: Record<string, unknown>;
  eventUrl: string;
  timestamp: Date;
  eventId: string;
}

export class WatchService {
  async getActiveSubscriptions(): Promise<
    Array<{ id: string; guildId: string; channelId: string; type: string; target: string }>
  > {
    return db.query.notifications.findMany({
      where: eq(notifications.isEnabled, true),
    });
  }

  async checkForNewEvents(): Promise<WatchNotificationEvent[]> {
    const subscriptions = await this.getActiveSubscriptions();
    if (subscriptions.length === 0) return [];

    const events: WatchNotificationEvent[] = [];
    const reposByNotification = new Map<string, string[]>();
    const uniqueRepos = new Set<string>();

    for (const sub of subscriptions) {
      uniqueRepos.add(sub.target);
      const existing = reposByNotification.get(sub.target) || [];
      existing.push(sub.id);
      reposByNotification.set(sub.target, existing);
    }

    for (const repoFullName of uniqueRepos) {
      try {
        const result = await this.fetchAndDeduplicate(repoFullName);
        for (const event of result.newEvents) {
          const notificationIds = reposByNotification.get(repoFullName) || [];
          for (const notifId of notificationIds) {
            const sub = subscriptions.find((s) => s.id === notifId);
            if (!sub) continue;

            const matches = this.doesEventTypeMatch(sub.type, event);
            if (matches) {
              events.push({
                repoFullName,
                eventType: this.mapNotifType(sub.type),
                actor: event.actor?.login || "unknown",
                actorAvatar: event.actor?.avatar_url || "",
                payload: event.payload || {},
                eventUrl: this.getEventUrl(repoFullName, event),
                timestamp: new Date(event.created_at),
                eventId: `${repoFullName}:${event.id}:${event.type}`,
              });
            }
          }
        }
      } catch (err: unknown) {
        logger.warn(
          { err, repo: repoFullName },
          "Failed to fetch events for watch subscription",
        );
      }
    }

    return events;
  }

  private async fetchAndDeduplicate(repoFullName: string): Promise<{
    newEvents: GitHubRepoEvent[];
    latestReleaseTag: string | null;
  }> {
    const events = await githubClient.getRepoEvents(repoFullName, 30);
    if (events.length === 0) {
      return { newEvents: [], latestReleaseTag: null };
    }

    const newEvents: GitHubRepoEvent[] = [];
    for (const event of events) {
      const eventId = `${repoFullName}:${event.id}:${event.type}`;
      const exists = await cache.get(`gh:event:${eventId}`);
      if (!exists) {
        newEvents.push(event);
        await cache.set(`gh:event:${eventId}`, "1", 7 * 24 * 3600);
      }
    }

    const latestReleaseTag = await githubClient.getLatestReleaseTag(repoFullName);

    return { newEvents, latestReleaseTag };
  }

  private doesEventTypeMatch(notifType: string, event: GitHubRepoEvent): boolean {
    const payload = event.payload || {};
    const action = payload.action as string | undefined;

    switch (notifType) {
      case "github_release":
        return event.type === "ReleaseEvent" || event.type === "CreateEvent";
      case "github_pr":
        return (
          event.type === "PullRequestEvent" &&
          ["opened", "reopened", "synchronize"].includes(action || "")
        );
      case "security_alert":
        return event.type === "SecurityAdvisoryEvent";
      default:
        return false;
    }
  }

  private mapNotifType(notifType: string): WatchNotificationEvent["eventType"] {
    switch (notifType) {
      case "github_release":
        return "release";
      case "github_pr":
        return "pull_request";
      case "security_alert":
        return "security_alert";
      default:
        return "pull_request";
    }
  }

  private getEventUrl(repoFullName: string, event: GitHubRepoEvent): string {
    const payload = event.payload || {};
    const baseUrl = `https://github.com/${repoFullName}`;

    if (event.type === "PullRequestEvent") {
      const pr = payload.pull_request as { number?: number } | undefined;
      return pr?.number ? `${baseUrl}/pull/${pr.number}` : baseUrl;
    }

    if (event.type === "ReleaseEvent") {
      const release = payload.release as { html_url?: string } | undefined;
      return release?.html_url || baseUrl;
    }

    return baseUrl;
  }

  async processWatchNotification(event: WatchNotificationEvent): Promise<void> {
    const eventId = event.eventId;
    try {
      await db.insert(gitHubEvents).values({
        id: eventId,
        repoFullName: event.repoFullName,
        eventId: event.eventId,
        eventType: event.eventType,
        action: "published",
        payload: event.payload,
      });
    } catch {
      // Duplicate event, skip
      return;
    }
  }

  async checkDependencyAlerts(repos: string[]): Promise<DependencyAlert[]> {
    const alerts: DependencyAlert[] = [];
    for (const repo of repos) {
      try {
        const deps = await githubClient.getDependencies(repo);
        if (deps.outdatedCount > 0) {
          const outdatedNames = deps.dependencies
            .filter((d) => d.isOutdated)
            .slice(0, 5)
            .map((d) => `${d.name}@${d.version}`);
          alerts.push({
            repoFullName: repo,
            totalCount: deps.totalCount,
            outdatedCount: deps.outdatedCount,
            outdatedPackages: outdatedNames,
          });
        }
      } catch (err: unknown) {
        logger.warn({ err, repo }, "Failed to check dependencies");
      }
    }
    return alerts;
  }
}

export const watchService = new WatchService();

export class SchedulerRunner {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private onReminderDue?: (reminder: DueReminder) => Promise<void>;
  private onMonitorAlert?: (outcome: MonitorCheckOutcome) => Promise<void>;
  private onWatchEvent?: (event: WatchNotificationEvent) => Promise<void>;
  private onDependencyAlert?: (alerts: DependencyAlert[]) => Promise<void>;

  setReminderHandler(handler: (reminder: DueReminder) => Promise<void>) {
    this.onReminderDue = handler;
  }

  setMonitorAlertHandler(handler: (outcome: MonitorCheckOutcome) => Promise<void>) {
    this.onMonitorAlert = handler;
  }

  setWatchEventHandler(handler: (event: WatchNotificationEvent) => Promise<void>) {
    this.onWatchEvent = handler;
  }

  setDependencyAlertHandler(handler: (alerts: DependencyAlert[]) => Promise<void>) {
    this.onDependencyAlert = handler;
  }

  start(intervalMs = 30000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info({ intervalMs }, "Starting background scheduler");

    this.timer = setInterval(async () => {
      await this.tick();
    }, intervalMs);
    this.timer.unref?.();

    this.tick().catch((err) => logger.error({ err }, "Initial scheduler tick failed"));
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info("Scheduler stopped");
  }

  async tick() {
    // 1. Process Due Reminders with distributed lock
    const reminderLock = await cache.acquireLock("scheduler:reminders:tick", 25);
    if (reminderLock) {
      try {
        const dueList = await reminderService.getDueReminders();
        for (const rem of dueList) {
          try {
            if (this.onReminderDue) {
              await this.onReminderDue(rem);
            }
            await reminderService.processReminderCompletion(rem);
          } catch (err: unknown) {
            logger.error({ err, reminderId: rem.id }, "Error delivering reminder");
          }
        }
      } finally {
        await cache.releaseLock("scheduler:reminders:tick");
      }
    }

    // 2. Process Website Monitors
    try {
      const outcomes = await monitoringService.runScheduledChecks();
      for (const o of outcomes) {
        if (o.statusChanged && this.onMonitorAlert) {
          await this.onMonitorAlert(o);
        }
      }
    } catch (err: unknown) {
      logger.error({ err }, "Error running scheduled monitor checks");
    }

    // 3. Check GitHub watch subscriptions for new events
    if (this.onWatchEvent) {
      const watchLock = await cache.acquireLock("scheduler:watch:tick", 55);
      if (watchLock) {
        try {
          const watchEvents = await watchService.checkForNewEvents();
          for (const event of watchEvents) {
            try {
              await this.onWatchEvent(event);
              await watchService.processWatchNotification(event);
            } catch (err: unknown) {
              logger.error(
                { err, repo: event.repoFullName, eventType: event.eventType },
                "Error delivering watch notification",
              );
            }
          }
        } catch (err: unknown) {
          logger.error({ err }, "Error checking watch subscriptions");
        } finally {
          await cache.releaseLock("scheduler:watch:tick");
        }
      }
    }

    // 4. Check dependency alerts (hourly, only if handler set)
    if (this.onDependencyAlert) {
      const depLock = await cache.acquireLock("scheduler:deps:tick", 3600);
      if (depLock) {
        try {
          const subscriptions = await watchService.getActiveSubscriptions();
          const uniqueRepos = [...new Set(subscriptions.map((s) => s.target))];
          if (uniqueRepos.length > 0) {
            const alerts = await watchService.checkDependencyAlerts(uniqueRepos.slice(0, 10));
            if (alerts.length > 0) {
              await this.onDependencyAlert(alerts);
            }
          }
        } catch (err: unknown) {
          logger.error({ err }, "Error checking dependency alerts");
        } finally {
          await cache.releaseLock("scheduler:deps:tick");
        }
      }
    }
  }
}

export const scheduler = new SchedulerRunner();