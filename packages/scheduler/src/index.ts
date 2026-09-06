import { cache } from "@devpulse/cache";
import { NotFoundError } from "@devpulse/core";
import { db, reminders } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { monitoringService } from "@devpulse/monitoring";
import cronParser from "cron-parser";
import { and, desc, eq, lte } from "drizzle-orm";

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
        const p: any = cronParser;
        const parseFn = p.parseExpression || p.default?.parseExpression;
        const interval = parseFn(reminder.cronExpression);
        const nextDue = interval.next().toDate();
        await db.update(reminders).set({ dueAt: nextDue }).where(eq(reminders.id, reminder.id));
        return;
      } catch (err) {
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

export class SchedulerRunner {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private onReminderDue?: (reminder: DueReminder) => Promise<void>;
  private onMonitorAlert?: (outcome: any) => Promise<void>;

  setReminderHandler(handler: (reminder: DueReminder) => Promise<void>) {
    this.onReminderDue = handler;
  }

  setMonitorAlertHandler(handler: (outcome: any) => Promise<void>) {
    this.onMonitorAlert = handler;
  }

  start(intervalMs = 30000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info({ intervalMs }, "Starting background scheduler");

    this.timer = setInterval(async () => {
      await this.tick();
    }, intervalMs);

    // Initial immediate tick
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
          } catch (err) {
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
    } catch (err) {
      logger.error({ err }, "Error running scheduled monitor checks");
    }
  }
}

export const scheduler = new SchedulerRunner();
