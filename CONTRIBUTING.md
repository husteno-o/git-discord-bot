# Contributing to DevPulse

Thank you for contributing to DevPulse! This project is a production-grade developer platform with strict engineering standards.

---

## Development Standards

1. **Deterministic Core**: Every feature must operate without requiring external AI. AI is strictly an optional enhancement layer.
2. **Zero Placeholders**: Never commit TODO stubs, fake mock responses, empty handlers, or unhandled promise rejections.
3. **Multi-Tenant Integrity**: Always scope queries and operations to the initiating server's `guildId`. Data from Server A must never be accessible from Server B.
4. **Resilience**: Never allow Discord interactions to timeout. Always defer replies (`await interaction.deferReply()`) before executing network or database queries.
5. **SSRF Guard**: Any tool performing outbound network requests must validate targets using `validateSafeUrl()`.

---

## Local Development Workflow

```bash
# 1. Install dependencies
bun install

# 2. Run test suite
bun run test

# 3. Check types
bun run typecheck

# 4. Check linting and formatting
bun run lint

# 5. Automatically format code
bun run lint:fix

# 6. Run development bot
bun run dev:bot
```
