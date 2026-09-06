# DevPulse Setup & Deployment Guide

This document details configuring Discord Developer Portal, Turso Database, Upstash Redis, and GitHub integrations.

---

## 1. Discord Developer Portal Setup

1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a **New Application** named `DevPulse`.
3. Under the **Bot** tab:
   - Click **Reset Token** and copy the bot token into `DISCORD_TOKEN`.
   - Enable **Privileged Gateway Intents**:
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent** (Required for zero-log secret leak detection)
4. Under the **OAuth2** tab:
   - Select `bot` and `applications.commands` scopes.
   - Select Bot Permissions: `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Manage Messages`, `Use Slash Commands`.
   - Copy the generated URL to invite DevPulse to your Discord guild.

---

## 2. Database Setup (Turso / libSQL)

### Local Development
DevPulse defaults to local SQLite (`file:devpulse.db`), which initializes automatically on startup without requiring cloud credentials.

### Production Setup with Turso
1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
2. Authenticate & create database:
   ```bash
   turso auth signup
   turso db create devpulse-prod
   ```
3. Retrieve database URL and token:
   ```bash
   turso db show devpulse-prod --url
   turso db tokens create devpulse-prod
   ```
4. Set in `.env`:
   ```ini
   TURSO_DATABASE_URL=libsql://devpulse-prod-your-org.turso.io
   TURSO_AUTH_TOKEN=your_token_here
   ```

---

## 3. Cache Setup (Upstash Redis)

1. Create a free Redis database at [console.upstash.com](https://console.upstash.com).
2. Retrieve the REST URL and token from the Upstash console.
3. Configure in `.env`:
   ```ini
   UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```
*(Note: If Upstash credentials are omitted, DevPulse automatically runs using its high-speed in-memory cache provider.)*

---

## 4. GitHub Setup

For public repositories, DevPulse operates without a GitHub token (subject to GitHub's unauthenticated IP limit of 60 req/hr).
To increase rate limits to 5,000 req/hr:
1. Generate a Personal Access Token (classic or fine-grained) at [github.com/settings/tokens](https://github.com/settings/tokens) with `public_repo` read permissions.
2. Set in `.env`:
   ```ini
   GITHUB_TOKEN=ghp_your_token_here
   ```

---

## 5. Docker Deployment

```bash
docker compose up -d --build
```
This runs `devpulse-bot` and `devpulse-api` with persistent volume storage and automatic restart policies.
