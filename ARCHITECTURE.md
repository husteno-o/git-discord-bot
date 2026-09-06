# DevPulse System Architecture

DevPulse (internal codename: RavenDev) is designed from first principles as an enterprise-grade, multi-tenant developer operating system for Discord.

```
                  +-----------------------------------+
                  |         Discord Gateway           |
                  +-----------------+-----------------+
                                    |
                            (Events / Interactions)
                                    v
                  +-----------------------------------+
                  |          apps/bot (Discord)       |
                  |  - Slash Commands (16 suites)     |
                  |  - Interactive Buttons            |
                  |  - Category Select Menus          |
                  |  - Zero-Log Secret Scanner        |
                  +--------+------------------+-------+
                           |                  |
              (Service Calls)        (Distributed Locks)
                           v                  v
    +--------------------------------+  +--------------------------------+
    |         Domain Packages        |  |          Cache & Jobs          |
    |  - @devpulse/github            |  |  - @devpulse/cache             |
    |  - @devpulse/devtools          |  |    (Upstash Redis / Memory)    |
    |  - @devpulse/analytics         |  |  - @devpulse/scheduler         |
    |  - @devpulse/security          |  |    (Periodic Ticks, Mutex)     |
    |  - @devpulse/monitoring        |  +--------------------------------+
    |  - @devpulse/news              |
    |  - @devpulse/trending          |
    +----------------+---------------+
                     |
            (Relational Queries)
                     v
    +--------------------------------+  +--------------------------------+
    |        Database Layer          |  |          Fastify API           |
    |  - @devpulse/database          |  |  - apps/api                    |
    |  - Turso / libSQL              |  |  - /health, /ready, /metrics   |
    |  - Drizzle ORM Schema          |  +--------------------------------+
    +--------------------------------+
```

---

## 1. Multi-Tenant Isolation Model

All persistent records are strictly bound to either a Discord Server (`guildId`) or a Discord User (`userId`).
- Tables (`repositories`, `monitors`, `monitor_results`, `projects`, `reminders`, `standups`, `server_settings`) enforce `guild_id` foreign keys with `ON DELETE CASCADE`.
- Data access layers execute tenant authorization assertions (`assertTenantOwnership(entityGuildId, requestGuildId)`).
- Cross-tenant queries are structurally prevented by scoped composite indices:
  - `(guild_id, name)` for projects
  - `(guild_id, full_name)` for repositories
  - `(guild_id, user_id, date)` for daily standups

---

## 2. Caching & Resilience Strategy

- **Source of Truth**: Turso / libSQL is the primary persistent database. Redis is never used as the single source of truth.
- **Provider Abstraction**: `@devpulse/cache` implements `CacheProvider`, automatically selecting `@upstash/redis` in production environments or falling back to an in-memory TTL store for local development and tests.
- **Cache-Aside with Mutex Locking**: High-latency external endpoints (such as GitHub commits or OSV vulnerability queries) utilize `getOrSet()` with distributed mutex locks to prevent cache stampedes under concurrent user load.
- **Configured TTLs**:
  - GitHub Repo Metadata: 300 seconds
  - GitHub Commits & PRs: 300 seconds
  - GitHub Releases: 1,800 seconds
  - OSV / CVE Advisories: 86,400 seconds (24 hours)
  - Tech News: 900 seconds (15 minutes)
  - Trending Repositories: 1,800 seconds (30 minutes)

---

## 3. Asynchronous Worker & Scheduler

To avoid blocking Discord interaction threads:
- Synthetic website monitoring pings and reminder checks are decoupled into `@devpulse/scheduler`.
- Scheduled intervals run every 30 seconds.
- Mutex locks (`SET lock:scheduler:monitors NX EX 50`) guarantee that in a multi-instance container cluster, exactly one worker instance processes due checks at any given tick.
- Due reminders and status changes (e.g. healthy -> down or down -> recovered) trigger asynchronous event callbacks that format rich embeds and dispatch them to the server's configured alert channel.

---

## 4. Security & Defensive Engineering

1. **SSRF Guard (`@devpulse/devtools/src/ssrf.ts`)**:
   - Outbound HTTP, DNS, and SSL requests undergo URL validation.
   - Private IPv4 blocks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`) are blocked.
   - Private IPv6 ranges (`::1`, `fc00::/7`, `fe80::/10`) and IPv4-mapped IPv6 ranges are blocked.
   - Cloud metadata hosts (`169.254.169.254`, `metadata.google.internal`) are blocked.
2. **Zero-Log Secret Scanner (`@devpulse/security/src/secrets.ts`)**:
   - Scans non-bot messages for token patterns (GitHub PATs, AWS access keys, Discord bot tokens, RSA private keys, database connection strings).
   - Generates a one-way SHA-256 fingerprint for operational tracking without storing or logging the sensitive token.
   - Warns the author with an interactive `[Delete Leaked Message]` button and rotation recommendations.
3. **Structured Logging & Redaction (`@devpulse/logger`)**:
   - Pino redacts `*.token`, `*.apiKey`, `*.secret`, `*.password`, and `authorization` headers by default.
