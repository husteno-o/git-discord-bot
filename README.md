# DevPulse (RavenDev)

DevPulse is a production-grade GitHub power-user platform built specifically for Discord. It eliminates the need for developers to switch back and forth between Discord and browser tabs by providing repository intelligence, pull request reviews and merges, CI/CD monitoring, code investigation, and team turnaround telemetry directly within Discord slash commands and interactive components.

Repository: git@github.com:husteno-o/git-discord-bot.git
Website: Cloudflare Pages (apps/web)

---

## Architecture and Core Philosophy

DevPulse is built with the principle of zero configuration for public data and zero friction for everyday tasks:

1. Zero Connection Required for Public Repositories: Any developer on the server can run repository analysis, code searches, commit inspections, releases, and trending lookups without connecting an account.
2. Encrypted Token Storage: Personal Access Tokens (PATs) used for write actions (approving pull requests, merging, triggering GitHub Actions workflows) are encrypted using AES-256-GCM with per-record initialization vectors and authentication tags. Plaintext credentials are never logged or stored.
3. Native Discord Interface: Interactive buttons, select menus, and visual embed trees allow developers to navigate repository views, trigger merges, and review pull requests without typing lengthy commands.
4. Single Synchronized Runtime: Operates as a pure Discord bot with zero required inbound open ports. An optional Fastify health check server can be toggled via configuration when deploying to platforms that require port binding.

---

## Technology Stack

- Runtime: Bun 1.4+
- Language: TypeScript 5.7+ (Strict Mode, ESNext)
- Discord API: discord.js v14 with Gateway v10
- Database: Turso (libSQL) with Drizzle ORM
- Caching and Distributed Locks: Upstash Redis with automatic in-memory fallback
- Optional HTTP Engine: Fastify 5
- Code Quality and Formatting: Biome
- Test Suite: Vitest

---

## Core Feature Areas

### 1. Repository Intelligence (/repo)
Inspect any public or private repository:
- Overview: Stars, forks, open issues, pull requests, watchers, license, and default branch.
- Health Score: Automated calculation (0 to 100) assessing README existence, license, contributing guide, issue templates, description, topics, and maintenance activity.
- Dependencies: Dependency manifests, package managers, and direct dependency breakdowns.
- Growth: 30-day star velocity and repository expansion rate.
- Interactive Navigation: Direct button controls for switching between Overview, Commits, PRs, Issues, and Releases.

### 2. Pull Request Power Tools (/pr)
Perform real pull request workflows directly inside Discord:
- View Details: Full metadata, branch targets, author, line additions and deletions (+482 -193), review states, and cycle times.
- Status Checks: Comprehensive CI check runs and commit status results.
- Review Actions: Direct Discord interactive buttons to Approve, Request Changes, or Merge into the target branch.
- Filters: Stale pull requests and pull requests awaiting review.

### 3. Universal Search (/search)
Search across GitHub using official search qualifiers:
- Code Search: Search source code across files, organizations, and languages.
- Issues and Pull Requests: Filter by status, label, author, assignee, and mentions.
- Repositories: Search by topics, star counts, forks, and updated dates.
- Commits: Find commits by message, hash, author, or committer date.

### 4. Code Investigation (/code)
Inspect remote codebases without cloning:
- View File: Fetch and render syntax-highlighted code chunks with line numbers.
- Git Blame: Line-by-line attribution showing author, commit hash, commit message, and relative timestamp.
- Commit to PR Link: Resolve any commit SHA back to the associated pull request where it was merged.

### 5. Lifecycle Timeline (/investigate)
Trace an issue or feature request through its entire development lifecycle:
- Chronological Timeline: Issue Creation -> Commit -> Pull Request -> Code Review -> Merge -> Release Tag.
- Identifies who approved the change, what release it shipped in, and resolution time.

### 6. Developer Activity and Histograms (/activity)
Track engineering rhythm and repository momentum:
- Activity Visualizer: ASCII daily commit histograms displaying work distribution across Monday through Sunday.
- Churn Analysis: Additions versus deletions ratio to measure refactoring versus new feature volume.
- Personal Telemetry: The /activity me command displays personal contribution velocity.

### 7. GitHub Trending Radar (/trending)
Discover rising projects and libraries across modern ecosystems:
- Language Filters: TypeScript, Rust, AI and Machine Learning, Bun, Databases, Go, and Python.
- Velocity Metrics: Stars gained in daily, weekly, or monthly periods.

### 8. GitHub Watchtower (/watch)
Automated event subscriptions delivered to dedicated Discord channels:
- Channel Subscriptions: Listen for releases, new pull requests, opened issues, or security advisories.
- Configurable Routing: Route different event types to specific channels (for example, alerts to #dev-alerts and releases to #announcements).

### 9. CI/CD Workflow Intelligence (/actions)
Monitor and manage GitHub Actions pipelines:
- Visual Workflow Tree: Render branch and workflow statuses in structured ASCII trees.
- Run History: View recent runs, conclusion status (success, failure, cancelled, in_progress), duration, and triggering actors.
- Control Actions: Rerun failed jobs or cancel running workflows directly from Discord.

### 10. Security Radar (/security)
Security vulnerability tracking and alert management:
- Dependabot Alerts: Open security vulnerability reports with affected packages, patched versions, and severity tiers.
- Advisory Lookup: Search GitHub Security Advisories and CVE identifiers.
- Real-Time Secret Scanner: Background message monitor that immediately detects leaked API keys, tokens, or database credentials, alerts the author privately with rotation instructions, and offers one-click deletion.

### 11. Release Management (/release)
Track and draft releases:
- Latest Release: View published tags, assets, download counts, and release notes.
- Tag Comparison: Compare differences and commit counts between tags (for example, v1.2.0...v1.3.0).
- Release Notes Generator: Automatically compiles changelogs from merged pull requests between git tags.

### 12. Team Intelligence (/team)
Engineering team metrics designed for healthy collaboration:
- Throughput and Velocity: Merged PR volume and average turnaround time.
- Workload Balance: Review distribution across team members to prevent individual burnout.
- Zero Toxicity: Focuses on process improvement, cycle times, and review turnaround rather than arbitrary commit count rankings.

---

## Utilities and Convenience Commands

- /home: Morning developer command center showing your active PRs, pending reviews, repository watch alerts, and trending highlights.
- /connect: Securely store your GitHub Personal Access Token encrypted with AES-256-GCM.
- /why: Trace a specific file and line change back through Commit -> PR -> Originating Issue.
- /ask: Deterministic query helper for questions like pull requests waiting for review over 24 hours or frequently modified files.
- /tools: GitHub developer essentials including .gitignore generator, SPDX license viewer, and GitHub platform status.
- /settings: Server defaults, preferred repositories, alert routing, and quiet hours.
- /help: Interactive directory of all available commands grouped by category.

---

## Quick Start Guide

### Prerequisites
- Bun runtime (version 1.4 or higher)
- Discord Application Bot Token with Send Messages, Embed Links, and Use Slash Commands permissions
- (Optional) GitHub Personal Access Token for write operations and private repository access
- (Optional) Turso Database URL and Upstash Redis credentials

### 1. Clone Repository
```bash
git clone git@github.com:husteno-o/git-discord-bot.git
cd git-discord-bot
bun install
```

### 2. Configure Environment
Create your local environment file:
```bash
cp .env.example .env
```

Configure your credentials in `.env`:
```env
NODE_ENV=development
LOG_LEVEL=info

# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_id_here
DISCORD_PUBLIC_KEY=your_discord_public_key_here

# Database Configuration (Defaults to local file:devpulse.db)
TURSO_DATABASE_URL=file:devpulse.db
TURSO_AUTH_TOKEN=

# Redis Cache (Optional, defaults to in-memory cache)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# GitHub Configuration (Optional for public repositories)
GITHUB_TOKEN=
```

### 3. Verify Code Quality and Run Tests
```bash
# Typecheck all packages
bun run typecheck

# Run Biome linter
bun run lint

# Run Vitest test suite
bun run test

# Compile all workspaces
bun run build
```

### 4. Start the Application
```bash
# Start the Discord Bot
bun run start
```

---

## Deploying the Landing Page to Cloudflare Pages

The marketing and documentation landing page is located in the apps/web directory. It is built as an optimized static site ready for deployment on Cloudflare Pages.

### Method A: Cloudflare Dashboard Deployment
1. Log in to the Cloudflare dashboard and navigate to Workers & Pages -> Create Application -> Pages -> Connect to Git.
2. Select your repository: husteno-o/git-discord-bot.
3. Set the following build settings:
   - Framework preset: None
   - Build command: bun run build:web
   - Build output directory: apps/web/dist
4. Deploy the site.

### Method B: Wrangler CLI Deployment
```bash
# Build the static site bundle
bun run build:web

# Deploy directly via Wrangler
bun x wrangler pages deploy apps/web/dist --project-name=devpulse
```

---

## Docker Deployment

To run DevPulse in a containerized environment:

```bash
# Build Docker image
docker build -t devpulse:latest .

# Run with environment variables
docker run -d \
  --name devpulse \
  --env-file .env \
  devpulse:latest
```

Alternatively, use Docker Compose:
```bash
docker compose up -d
```

---

## Security and Compliance

- AES-256-GCM Encryption: Used for all sensitive user credentials stored in the database.
- Zero Secret Logging: Structured logger automatically masks and redacts access tokens, webhooks, and private keys.
- SSRF Guard: Outbound network checks strictly reject loopback, RFC 1918 private IPv4 addresses, and link-local ranges.
- Rate Limiting: Built-in sliding window rate limiter protects against abusive command execution.
