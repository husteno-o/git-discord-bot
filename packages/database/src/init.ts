import { logger } from "@devpulse/logger";
import { getDbClient } from "./client.js";

export async function initDatabase(client = getDbClient()): Promise<void> {
  logger.info("Verifying and initializing database tables...");

  try {
    await client.execute("PRAGMA journal_mode = WAL;");
    await client.execute("PRAGMA busy_timeout = 5000;");
  } catch {
    // Ignore if unsupported in remote Turso
  }

  const statements = [
    // 1. servers
    `CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon_url TEXT,
      owner_id TEXT NOT NULL,
      default_channel_id TEXT,
      ai_enabled INTEGER NOT NULL DEFAULT 0,
      secret_scanning_enabled INTEGER NOT NULL DEFAULT 1,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS servers_owner_idx ON servers (owner_id);`,

    // 2. users
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      discriminator TEXT DEFAULT '0',
      avatar_url TEXT,
      github_username TEXT,
      github_token_encrypted TEXT,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS users_github_username_idx ON users (github_username);`,

    // 3. server_memberships
    `CREATE TABLE IF NOT EXISTS server_memberships (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'developer',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS memberships_guild_user_idx ON server_memberships (guild_id, user_id);`,
    `CREATE INDEX IF NOT EXISTS memberships_guild_idx ON server_memberships (guild_id);`,
    `CREATE INDEX IF NOT EXISTS memberships_user_idx ON server_memberships (user_id);`,

    // 4. server_settings
    `CREATE TABLE IF NOT EXISTS server_settings (
      guild_id TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
      notification_channel_id TEXT,
      alert_role_id TEXT,
      disabled_commands TEXT DEFAULT '[]',
      news_categories TEXT DEFAULT '["developer","security","github"]',
      monitor_interval_seconds INTEGER DEFAULT 60,
      max_monitors INTEGER DEFAULT 10
    );`,

    // 5. projects
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      stack TEXT DEFAULT '[]',
      repositories TEXT DEFAULT '[]',
      services TEXT DEFAULT '[]',
      database_type TEXT,
      runtime TEXT,
      architecture_notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS projects_guild_name_idx ON projects (guild_id, name);`,
    `CREATE INDEX IF NOT EXISTS projects_guild_idx ON projects (guild_id);`,

    // 6. repositories
    `CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      full_name TEXT NOT NULL,
      is_private INTEGER NOT NULL DEFAULT 0,
      default_branch TEXT NOT NULL DEFAULT 'main',
      primary_language TEXT,
      stars INTEGER NOT NULL DEFAULT 0,
      forks INTEGER NOT NULL DEFAULT 0,
      open_issues INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS repositories_guild_full_name_idx ON repositories (guild_id, full_name);`,
    `CREATE INDEX IF NOT EXISTS repositories_guild_idx ON repositories (guild_id);`,

    // 7. monitors
    `CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      interval_seconds INTEGER NOT NULL DEFAULT 60,
      expected_status INTEGER NOT NULL DEFAULT 200,
      timeout_ms INTEGER NOT NULL DEFAULT 5000,
      ssl_check_enabled INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_checked_at INTEGER,
      last_status INTEGER,
      last_response_time_ms INTEGER,
      last_error TEXT,
      is_healthy INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS monitors_guild_idx ON monitors (guild_id);`,
    `CREATE INDEX IF NOT EXISTS monitors_active_idx ON monitors (is_active);`,

    // 8. monitor_results
    `CREATE TABLE IF NOT EXISTS monitor_results (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      guild_id TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER NOT NULL,
      is_healthy INTEGER NOT NULL,
      ssl_valid INTEGER,
      ssl_expires_at INTEGER,
      error_message TEXT,
      checked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS monitor_results_monitor_idx ON monitor_results (monitor_id);`,
    `CREATE INDEX IF NOT EXISTS monitor_results_checked_at_idx ON monitor_results (checked_at);`,

    // 9. notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      role_mention_id TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS notifications_guild_idx ON notifications (guild_id);`,
    `CREATE INDEX IF NOT EXISTS notifications_type_target_idx ON notifications (type, target);`,

    // 10. reminders
    `CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      due_at INTEGER NOT NULL,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      cron_expression TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS reminders_guild_idx ON reminders (guild_id);`,
    `CREATE INDEX IF NOT EXISTS reminders_due_at_idx ON reminders (due_at, is_completed);`,

    // 11. standups
    `CREATE TABLE IF NOT EXISTS standups (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      yesterday_activity TEXT DEFAULT '[]',
      today_plan TEXT NOT NULL,
      blockers TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS standups_guild_user_date_idx ON standups (guild_id, userId, date);`,

    // 12. analytics_snapshots
    `CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      period TEXT NOT NULL,
      metrics TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS analytics_guild_entity_idx ON analytics_snapshots (guild_id, entity_type, entity_id);`,

    // 13. audit_logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS audit_logs_guild_idx ON audit_logs (guild_id);`,

    // 14. github_events (event deduplication for /watch polling)
    `CREATE TABLE IF NOT EXISTS github_events (
      id TEXT PRIMARY KEY,
      repo_full_name TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      action TEXT,
      payload TEXT NOT NULL,
      processed_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );`,
    `CREATE INDEX IF NOT EXISTS github_events_repo_idx ON github_events (repo_full_name);`,
    `CREATE INDEX IF NOT EXISTS github_events_repo_event_idx ON github_events (repo_full_name, event_id);`,
    `CREATE INDEX IF NOT EXISTS github_events_retention_idx ON github_events (processed_at);`,

    // 15. Data retention cleanup for monitor_results and audit_logs
    `DELETE FROM monitor_results WHERE checked_at < (unixepoch('now', '-90 days') * 1000);`,
    `DELETE FROM audit_logs WHERE created_at < (unixepoch('now', '-30 days') * 1000);`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  logger.info("Database schema initialized successfully.");
}
