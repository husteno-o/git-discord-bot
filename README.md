# 🐦 DevPulse (RavenDev)

> **The Developer Operating System for Discord.** A production-grade, multi-tenant developer platform providing GitHub intelligence, telemetry, 30+ deterministic offline developer tools, security audits, website uptime monitoring, tech news, and team workflows inside Discord.

---

## 🌟 Key Capabilities

- **📦 Deep GitHub Intelligence**: Interactive repository dashboards with observed activity logs (14 days), workload distribution, focus breakdown, cycle times, PR throughput, and button navigation (`/github repo`).
- **👨‍💻 Developer Productivity & Telemetry**: Personal dashboards tracking commits, PRs, review velocity, day-of-week workload balance, and turnaround times (`/dev dashboard`).
- **🛠️ Deterministic Developer Toolbox**: 30+ tools operating 100% offline with zero AI dependencies:
  - JSON (prettify, minify, validate)
  - YAML (format, YAML ↔ JSON)
  - Cryptography (SHA-256, MD5, SHA-512, UUID v4/v7)
  - JWT inspector (headers, claims, expiration)
  - Regex evaluator & match tester
  - Crontab parser with future run times
  - Unix timestamp & timezone converter
  - Permissions (Chmod octal & symbolic calculator)
  - Semver comparator
  - Network (HTTP tester with strict SSRF blocker, DNS resolution, SSL cert inspector, HTTP status reference)
- **📦 Package & Dependency Intelligence**: Live registry lookup across npm, PyPI, crates.io, and Go modules (`/deps lookup`).
- **🛡️ Security Center & Zero-Log Secret Scanner**:
  - Live CVE / GHSA advisory lookup powered by OSV (`/security cve`).
  - Automated message secret detection (scans for leaked GitHub tokens, AWS keys, private keys, database URLs, and Discord bot tokens; warns author immediately with rotation guide and deletion button; never logs or persists secrets).
- **📡 Website & Synthetic Health Monitoring**: HTTP status, response latency, and SSL certificate expiration checks running on an asynchronous scheduler (`/monitor add`).
- **👥 Team Workflows & Project Memory**: Daily engineering standup generator with observed GitHub telemetry (`/team standup`), reminders (`/remind in`), and architectural context memory (`/project add`).
- **🔥 Trending & Tech News**: Real-time trending GitHub repositories, fast-growing developer technologies, and curated RSS news feeds across 10+ categories (`/trending`, `/news`).
- **🤖 Optional AI Provider**: Vendor-agnostic AI provider abstraction (OpenAI, Anthropic, Gemini). The core platform operates deterministically without any AI API key configured.

---

## 🏗️ Architecture & Technology Stack

- **Runtime**: [Bun 1.4](https://bun.sh)
- **Language**: TypeScript 5.7+ (Strict mode, ESNext)
- **Discord Library**: [discord.js v14](https://discord.js.org)
- **Database**: [Turso (libSQL / SQLite)](https://turso.tech) with [Drizzle ORM](https://orm.drizzle.team)
- **Caching & Locks**: [Upstash Redis](https://upstash.com) with resilient in-memory fallback
- **HTTP Server**: [Fastify 5](https://fastify.dev)
- **Validation**: [Zod](https://zod.dev)
- **Structured Logging**: [Pino](https://getpino.io) with automatic credential redaction
- **Code Quality**: [Biome](https://biomejs.dev)
- **Test Suite**: [Vitest](https://vitest.dev)

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/swadhin/discordbot.git
cd discordbot
bun install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

### 3. Verify System Health
Run quality checks:
```bash
# Typecheck all 16 workspaces
bun run typecheck

# Run linter
bun run lint

# Execute automated tests
bun run test

# Compile production bundles
bun run build
```

### 4. Start Services
```bash
# Run the Discord Bot
bun run start:bot

# Run the Fastify API (Health checks & Webhooks)
bun run start:api
```

---

## 📋 Slash Command Reference

| Command | Subcommand | Description |
| :--- | :--- | :--- |
| `/github` | `repo <owner/repo>` | Comprehensive repository dashboard with interactive buttons |
| `/github` | `commits <owner/repo>` | View recent commit log and authors |
| `/github` | `prs <owner/repo>` | View active and merged pull requests |
| `/github` | `issues <owner/repo>` | View open issue reports and comments |
| `/github` | `releases <owner/repo>` | View published version releases |
| `/dev` | `dashboard` | Personal developer productivity and focus telemetry |
| `/dev` | `profile [user]` | Inspect public developer statistics |
| `/dev` | `link-github <user>` | Bind GitHub account for automated telemetry |
| `/tools` | `json <action> <input>` | JSON formatting, minification, and validation |
| `/tools` | `yaml <action> <input>` | YAML formatting and YAML ↔ JSON conversion |
| `/tools` | `jwt <token>` | Decodes token header, payload, algorithm, and expiration |
| `/tools` | `hash <algo> <input>` | Generate SHA-256, MD5, SHA-1, or SHA-512 hash |
| `/tools` | `uuid [v4\|v7]` | Generate random or time-ordered UUID |
| `/tools` | `regex <pattern> <text>` | Test regex patterns with match groups |
| `/tools` | `cron <expression>` | Human-readable schedule explanation + next 5 runs |
| `/tools` | `timestamp <value>` | Convert Unix epoch <-> ISO <-> relative Discord time |
| `/tools` | `timezone <time> <from> <to>` | Convert between international timezones |
| `/tools` | `chmod <value>` | Octal <-> symbolic permissions calculator |
| `/tools` | `semver <v1> <v2>` | Compare two semantic version strings |
| `/tools` | `http <url> [method]` | Safe HTTP tester with strict SSRF blocker |
| `/tools` | `dns <domain> [type]` | Resolve A, AAAA, MX, TXT, NS records |
| `/tools` | `ssl <domain>` | Inspect SSL certificate issuer and days remaining |
| `/tools` | `status <code>` | HTTP status code catalog and explanations |
| `/deps` | `lookup <eco> <pkg>` | Dependency inspector for npm, PyPI, crates.io, Go |
| `/security` | `cve <id>` | OSV / CVE vulnerability advisory lookup |
| `/security` | `package <eco> <pkg>` | Check open vulnerability advisories |
| `/security` | `status` | View security policies and secret scanner state |
| `/monitor` | `add <url> [name]` | Add website or API endpoint to synthetic monitor |
| `/monitor` | `list` | View configured monitors with real-time status |
| `/monitor` | `status <id>` | View latency sparkline and check history |
| `/monitor` | `remove <id>` | Remove monitor |
| `/trending` | `github [lang] [period]`| Trending repositories with high star velocity |
| `/trending` | `technologies` | Fastest-growing developer tools and runtimes |
| `/news` | `latest [category]` | Curated tech news headlines from verified feeds |
| `/team` | `standup <today> [blockers]` | Post standup with observed GitHub activity |
| `/team` | `activity` | Aggregated team velocity and commit throughput |
| `/remind` | `in <duration> <note>` | Timezone-aware reminders (`30m`, `2h`, `1d`) |
| `/project` | `add <name> <stack>` | Register architectural project memory |
| `/project` | `view <name>` | View project context and tech stack |
| `/settings` | `view` | View server policies, channel routing, and toggles |
| `/setup` | *(None)* | Interactive guided server onboarding wizard |
| `/help` | `[module]` | Interactive command browser with category select menu |
