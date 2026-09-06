# DevPulse Slash Command Reference

Detailed documentation of all 16 command groups and subcommands.

---

### `/github`
- `/github repo <repository>`: Generates complete repository dashboard with observed activity log, workload distribution, focus breakdown, and cycle times.
- `/github commits <repository>`: Shows the latest commits, commit messages, and authors.
- `/github prs <repository>`: Displays recent pull requests with status tags (🟣 merged, 🟢 open, 🔴 closed).
- `/github issues <repository>`: Displays open issues and discussion comment counts.
- `/github releases <repository>`: Displays published tags, release titles, and dates.

---

### `/dev`
- `/dev dashboard`: Personal developer telemetry over the last 7 days.
- `/dev profile [user]`: Public developer profile overview.
- `/dev link-github <username>`: Connects your GitHub username to your Discord identity.

---

### `/tools`
- `/tools json <action> <input>`: JSON formatting, minification, and schema validation.
- `/tools yaml <action> <input>`: Formats YAML or translates between JSON and YAML.
- `/tools jwt <token>`: Inspects headers, payload claims, and token expiration.
- `/tools base64 <encode|decode> <input>`: String Base64 codec.
- `/tools url <encode|decode> <input>`: URL URI encoder and decoder.
- `/tools hash <algorithm> <input>`: Cryptographic hashing (SHA-256, MD5, SHA-1, SHA-512).
- `/tools uuid [v4|v7]`: Generates random or time-ordered UUIDs.
- `/tools regex <pattern> <text>`: Evaluates regular expressions and returns match groups.
- `/tools cron <expression>`: Interprets crontab schedules and lists the next 5 executions.
- `/tools timestamp <value>`: Converts between Unix epoch, ISO 8601, and Discord dynamic timestamps.
- `/tools timezone <time> <from> <to>`: Converts times across international timezones.
- `/tools chmod <value>`: Translates between octal (e.g. 755) and symbolic (`rwxr-xr-x`) file permissions.
- `/tools semver <v1> <v2>`: Calculates difference level (major, minor, patch, prerelease).
- `/tools http <url> [method]`: Pings HTTP endpoints with latency, headers, and SSRF blocking.
- `/tools dns <domain> [type]`: Resolves DNS records (A, AAAA, MX, TXT, NS).
- `/tools ssl <domain>`: Inspects SSL/TLS certificate validity, issuer, and days until expiration.
- `/tools status <code>`: HTTP status code catalog and RFC descriptions.
- `/tools cheatsheet <tool>`: Rapid command references for Git, Docker, and Linux.

---

### `/deps`
- `/deps lookup <ecosystem> <package>`: Registry search across npm, PyPI, crates.io, and Go modules.

---

### `/security`
- `/security cve <id>`: Detailed CVE / GHSA advisory lookup.
- `/security package <ecosystem> <name>`: Audit package vulnerabilities.
- `/security status`: View server security telemetry.

---

### `/monitor`
- `/monitor add <url> [name] [interval]`: Registers synthetic uptime and latency monitor.
- `/monitor list`: Lists all configured endpoints and statuses.
- `/monitor status <id>`: Shows latency sparklines and check history.
- `/monitor remove <id>`: Deletes monitor.

---

### `/trending`
- `/trending github [language] [period]`: Real-time trending GitHub repos.
- `/trending technologies`: Fast-growing tools and runtimes.

---

### `/news`
- `/news latest [category]`: Tech news headlines from verified feeds.

---

### `/team`
- `/team standup <today> [blockers]`: Posts daily standup with observed yesterday GitHub telemetry.
- `/team activity`: Aggregated velocity across monitored repositories.

---

### `/remind`
- `/remind in <duration> <note>`: Timezone-aware reminders (`30m`, `2h`, `1d`).
- `/remind list`: Lists your active reminders.
- `/remind cancel <id>`: Cancels a pending reminder.

---

### `/project`
- `/project add <name> <stack>`: Adds an architectural context memory.
- `/project view <name>`: Displays architectural specifications.
- `/project list`: Lists server projects.

---

### `/settings`
- `/settings view`: Displays server configuration.
- `/settings set-channel <channel>`: Sets alert channel.
- `/settings toggle-secrets <enabled>`: Toggles zero-log secret leak detection.
- `/settings toggle-ai <enabled>`: Toggles optional AI capability.
- `/settings timezone <tz>`: Sets server default timezone.

---

### `/help` & `/setup`
- `/help [module]`: Interactive help browser with select menu.
- `/setup`: Onboarding guide for new server administrators.
