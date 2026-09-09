# DevPulse

A Discord bot that brings GitHub workflows into your server. No browser tab switching, no context loss — just slash commands.

Repo: git@github.com:husteno-o/git-discord-bot.git
Landing page: apps/web (deploys to Cloudflare Pages)

---

## What It Actually Does

You run `/repo`, `/pr`, `/code`, or any of the 21 slash commands, and DevPulse talks to GitHub and posts results right in your Discord channel. Public repos work with zero setup. Private repos and write actions (approve, merge, rerun CI) need you to connect your GitHub token via `/connect`.

Tokens are encrypted with AES-256-GCM before they hit the database. Plaintext never gets logged. That's the deal.

The bot runs as a pure Discord client — no inbound ports required. There's an optional Fastify health check if your hosting platform insists on a port binding.

---

## Stack

- Bun 1.4+
- TypeScript 5.7 (strict)
- discord.js v14
- Turso (libSQL) with Drizzle ORM
- Upstash Redis (falls back to in-memory)
- Fastify 5 (optional)
- Biome, Vitest

---

## Commands

**Repository Intelligence** `/repo` — stars, forks, issues, health score (0–100), dependencies, 30-day growth. Buttons to navigate overview, commits, PRs, issues, releases.

**Pull Request Tools** `/pr` — metadata, CI status, line diffs. Approve, request changes, or merge from Discord. Filter stale PRs or PRs awaiting review.

**Search** `/search` — code, issues, PRs, repos, commits using GitHub's search qualifiers.

**Code Investigation** `/code` — view files with syntax highlighting and line numbers, git blame, resolve a commit SHA back to its PR.

**Lifecycle Timeline** `/investigate` — trace an issue from creation through commit, PR, review, merge, to release tag.

**Activity** `/activity` — ASCII commit histograms by day of week, churn analysis (additions vs deletions), personal contribution velocity.

**Trending** `/trending` — rising projects with language filters (TypeScript, Rust, Go, Python, etc.) and star velocity metrics.

**Watchtower** `/watch` — subscribe a channel to releases, new PRs, issues, or security advisories.

**CI/CD** `/actions` — workflow run history, ASCII status trees, rerun failed jobs, cancel running workflows.

**Security** `/security` — Dependabot alerts, CVE lookups, real-time secret scanning that catches leaked keys in messages and tells the author to rotate them.

**Releases** `/release` — latest release info, tag comparison, auto-generated changelogs from merged PRs.

**Team** `/team` — throughput, average PR turnaround, review distribution. No commit-count leaderboards. Process metrics only.

**Utilities:**
- `/home` — your morning dashboard: active PRs, pending reviews, watch alerts, trending.
- `/connect` — store your GitHub PAT, encrypted.
- `/why` — trace a file+line back through commit, PR, to originating issue.
- `/ask` — answer questions like "what PRs are waiting for review?" or "which files change most?"
- `/tools` — .gitignore generator, SPDX license viewer, GitHub status.
- `/settings` — server defaults, preferred repos, alert routing, quiet hours.
- `/help` — interactive command directory.

---

## Quick Start

**Requirements:** Bun 1.4+, a Discord bot application, optionally Turso and Upstash Redis.

```bash
git clone git@github.com:husteno-o/git-discord-bot.git
cd git-discord-bot
bun install
cp .env.example .env
```

Fill in `.env`:

```env
NODE_ENV=development
LOG_LEVEL=info

DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_app_id
DISCORD_PUBLIC_KEY=your_public_key

TURSO_DATABASE_URL=file:devpulse.db
TURSO_AUTH_TOKEN=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

GITHUB_TOKEN=
```

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run start
```

---

## Landing Page (Cloudflare Pages)

Build the static site:

```bash
bun run build:web
```

Then deploy via Wrangler:

```bash
bun x wrangler pages deploy apps/web/dist --project-name=devpulse
```

Or connect the repo in the Cloudflare dashboard with build command `bun run build:web` and output directory `apps/web/dist`.

---

## Docker

```bash
docker build -t devpulse:latest .
docker run -d --name devpulse --env-file .env devpulse:latest
```

Or:

```bash
docker compose up -d
```

---

## Security

- AES-256-GCM for stored tokens, with per-record IVs and auth tags.
- Structured logger redacts secrets automatically.
- SSRF guard blocks loopback, RFC 1918, and link-local addresses on outbound requests.
- Sliding window rate limiter on commands.
