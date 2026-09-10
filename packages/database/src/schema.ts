import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// 1. Servers (Discord Guilds)
export const servers = sqliteTable(
  "servers",
  {
    id: text("id").primaryKey(), // Discord Guild ID
    name: text("name").notNull(),
    iconUrl: text("icon_url"),
    ownerId: text("owner_id").notNull(),
    defaultChannelId: text("default_channel_id"),
    aiEnabled: integer("ai_enabled", { mode: "boolean" }).notNull().default(false),
    secretScanningEnabled: integer("secret_scanning_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerIdx: index("servers_owner_idx").on(table.ownerId),
  }),
);

// 2. Users
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(), // Discord User ID
    username: text("username").notNull(),
    discriminator: text("discriminator").default("0"),
    avatarUrl: text("avatar_url"),
    githubUsername: text("github_username"),
    githubTokenEncrypted: text("github_token_encrypted"),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    githubUsernameIdx: index("users_github_username_idx").on(table.githubUsername),
  }),
);

// 3. Server Memberships (RBAC)
export const serverMemberships = sqliteTable(
  "server_memberships",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "lead", "developer", "viewer"] })
      .notNull()
      .default("viewer"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildUserIdx: uniqueIndex("memberships_guild_user_idx").on(table.guildId, table.userId),
    guildIdx: index("memberships_guild_idx").on(table.guildId),
    userIdx: index("memberships_user_idx").on(table.userId),
  }),
);

// 4. Server Settings
export const serverSettings = sqliteTable("server_settings", {
  guildId: text("guild_id")
    .primaryKey()
    .references(() => servers.id, { onDelete: "cascade" }),
  notificationChannelId: text("notification_channel_id"),
  alertRoleId: text("alert_role_id"),
  disabledCommands: text("disabled_commands", { mode: "json" })
    .$type<string[]>()
    .default(sql`'[]'`),
  newsCategories: text("news_categories", { mode: "json" })
    .$type<string[]>()
    .default(sql`'["developer","security","github"]'`),
  monitorIntervalSeconds: integer("monitor_interval_seconds").default(60),
  maxMonitors: integer("max_monitors").default(10),
});

// 5. Projects
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    stack: text("stack", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
    repositories: text("repositories", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
    services: text("services", { mode: "json" }).$type<string[]>().default(sql`'[]'`),
    databaseType: text("database_type"),
    runtime: text("runtime"),
    architectureNotes: text("architecture_notes"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildIdx: index("projects_guild_idx").on(table.guildId),
    guildNameIdx: uniqueIndex("projects_guild_name_idx").on(table.guildId, table.name),
  }),
);

// 6. Repositories
export const repositories = sqliteTable(
  "repositories",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
    defaultBranch: text("default_branch").notNull().default("main"),
    primaryLanguage: text("primary_language"),
    stars: integer("stars").notNull().default(0),
    forks: integer("forks").notNull().default(0),
    openIssues: integer("open_issues").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildIdx: index("repositories_guild_idx").on(table.guildId),
    guildFullNameIdx: uniqueIndex("repositories_guild_full_name_idx").on(
      table.guildId,
      table.fullName,
    ),
  }),
);

// 7. Monitors (Uptime & Health checks)
export const monitors = sqliteTable(
  "monitors",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    method: text("method", { enum: ["GET", "HEAD", "POST"] })
      .notNull()
      .default("GET"),
    intervalSeconds: integer("interval_seconds").notNull().default(60),
    expectedStatus: integer("expected_status").notNull().default(200),
    timeoutMs: integer("timeout_ms").notNull().default(5000),
    sslCheckEnabled: integer("ssl_check_enabled", { mode: "boolean" }).notNull().default(true),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    lastStatus: integer("last_status"),
    lastResponseTimeMs: integer("last_response_time_ms"),
    lastError: text("last_error"),
    isHealthy: integer("is_healthy", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildIdx: index("monitors_guild_idx").on(table.guildId),
    activeIdx: index("monitors_active_idx").on(table.isActive),
  }),
);

// 8. Monitor Results
export const monitorResults = sqliteTable(
  "monitor_results",
  {
    id: text("id").primaryKey(),
    monitorId: text("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    guildId: text("guild_id").notNull(),
    statusCode: integer("status_code"),
    responseTimeMs: integer("response_time_ms").notNull(),
    isHealthy: integer("is_healthy", { mode: "boolean" }).notNull(),
    sslValid: integer("ssl_valid", { mode: "boolean" }),
    sslExpiresAt: integer("ssl_expires_at", { mode: "timestamp_ms" }),
    errorMessage: text("error_message"),
    checkedAt: integer("checked_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    monitorIdx: index("monitor_results_monitor_idx").on(table.monitorId),
    checkedAtIdx: index("monitor_results_checked_at_idx").on(table.checkedAt),
  }),
);

// 9. Notifications (Event Subscriptions)
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(),
    type: text("type", {
      enum: [
        "github_release",
        "github_pr",
        "monitor_down",
        "monitor_up",
        "security_alert",
        "news_digest",
      ],
    }).notNull(),
    target: text("target").notNull(), // e.g. "owner/repo" or monitorId or "all"
    roleMentionId: text("role_mention_id"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildIdx: index("notifications_guild_idx").on(table.guildId),
    typeTargetIdx: index("notifications_type_target_idx").on(table.type, table.target),
  }),
);

// 10. Reminders
export const reminders = sqliteTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    dueAt: integer("due_at", { mode: "timestamp_ms" }).notNull(),
    isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
    cronExpression: text("cron_expression"),
    isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildIdx: index("reminders_guild_idx").on(table.guildId),
    dueAtIdx: index("reminders_due_at_idx").on(table.dueAt, table.isCompleted),
  }),
);

// 11. Standups
export const standups = sqliteTable(
  "standups",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    yesterdayActivity: text("yesterday_activity", { mode: "json" })
      .$type<string[]>()
      .default(sql`'[]'`),
    todayPlan: text("today_plan").notNull(),
    blockers: text("blockers"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildUserDateIdx: uniqueIndex("standups_guild_user_date_idx").on(
      table.guildId,
      table.userId,
      table.date,
    ),
  }),
);

// 12. Analytics Snapshots
export const analyticsSnapshots = sqliteTable(
  "analytics_snapshots",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    entityType: text("entity_type", { enum: ["repo", "user", "team"] }).notNull(),
    entityId: text("entity_id").notNull(), // repo fullName or userId or guildId
    period: text("period", { enum: ["day", "week", "month"] }).notNull(),
    metrics: text("metrics", { mode: "json" }).notNull(),
    timestamp: integer("timestamp", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildEntityIdx: index("analytics_guild_entity_idx").on(
      table.guildId,
      table.entityType,
      table.entityId,
    ),
  }),
);

// 13. Audit Logs
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    details: text("details", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildIdx: index("audit_logs_guild_idx").on(table.guildId),
  }),
);

// 14. GitHub Events (for /watch polling deduplication)
export const gitHubEvents = sqliteTable(
  "github_events",
  {
    id: text("id").primaryKey(), // `${repoFullName}:${eventId}:${eventType}`
    repoFullName: text("repo_full_name").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(), // "release", "pull_request", "issue", "security_advisory"
    action: text("action"), // "published", "opened", "created", "resolved"
    payload: text("payload", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    processedAt: integer("processed_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    repoIdx: index("github_events_repo_idx").on(table.repoFullName),
    repoEventIdx: index("github_events_repo_event_idx").on(table.repoFullName, table.eventId),
  }),
);
