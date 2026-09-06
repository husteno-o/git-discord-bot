# Security Policy

## Reporting Security Issues

If you discover a vulnerability or security flaw in DevPulse, please report it privately to `security@devpulse.io` or open a private advisory on GitHub.

---

## Defensive Engineering Principles

### 1. SSRF Guard
DevPulse restricts outbound network calls from commands like `/tools http`, `/tools dns`, `/tools ssl`, and `/monitor add`.
- Rejects private IPv4 and IPv6 blocks (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`, `fc00::/7`).
- Prevents DNS rebinding by inspecting resolved socket addresses.

### 2. Zero-Log Secret Scanning
- Discord message content is scanned strictly in-memory using regex pattern analysis.
- Plaintext secrets are NEVER logged, persisted in SQLite/Turso, or sent to external AI providers.
- A one-way SHA-256 fingerprint hash is utilized for ephemeral deduplication.

### 3. Least Privilege & Multi-Tenancy
- Database schema enforces foreign key cascade deletions.
- Server-side role-based access control (`@devpulse/permissions`) checks authorization prior to executing administrative tasks.
