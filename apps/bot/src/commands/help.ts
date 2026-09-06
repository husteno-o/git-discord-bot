import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createHelpSelect } from "../ui/components.js";
import { createBaseEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Explore DevPulse developer commands and architectural modules")
    .addStringOption((opt) =>
      opt
        .setName("module")
        .setDescription("Specific module to inspect")
        .addChoices(
          { name: "GitHub Intelligence", value: "github" },
          { name: "Developer Productivity", value: "dev" },
          { name: "Developer Toolbox", value: "tools" },
          { name: "Security Center", value: "security" },
          { name: "Website Monitoring", value: "monitor" },
          { name: "Trending & News", value: "trending" },
          { name: "Team & Workflows", value: "team" },
          { name: "Server Settings", value: "settings" },
        ),
    ),

  async execute(interaction) {
    const mod = interaction.options.getString("module");

    if (!mod) {
      const embed = createBaseEmbed("🐦 DevPulse (RavenDev) — Developer Command Center")
        .setColor(BrandColors.primary)
        .setDescription(
          "Welcome to **DevPulse**, the production developer operating system for Discord.\n\n" +
            "Use the select menu below to explore features, or run any of the primary command suites:",
        )
        .addFields(
          {
            name: "📦 GitHub Intelligence",
            value: "`/github repo`, `/github commits`, `/github prs`, `/github issues`",
            inline: false,
          },
          {
            name: "👨‍💻 Developer Telemetry & System",
            value: "`/dev dashboard`, `/dev profile`, `/dev link-github`, `/dev system`",
            inline: false,
          },
          {
            name: "🛠️ Developer Toolbox",
            value:
              "`/tools json`, `/tools yaml`, `/tools jwt`, `/tools hash`, `/tools cron`, `/tools http`",
            inline: false,
          },
          {
            name: "📦 Package Intelligence",
            value: "`/deps lookup <ecosystem> <package>`",
            inline: false,
          },
          {
            name: "🛡️ Security Center",
            value: "`/security cve`, `/security package`, `/security status`",
            inline: false,
          },
          {
            name: "📡 Website Monitoring",
            value: "`/monitor add`, `/monitor list`, `/monitor status`",
            inline: false,
          },
          {
            name: "🔥 Trending & News",
            value: "`/trending github`, `/trending technologies`, `/news latest`",
            inline: false,
          },
          {
            name: "👥 Team Workflows",
            value: "`/team standup`, `/team activity`, `/remind in`, `/project add`",
            inline: false,
          },
          {
            name: "⚙️ Administration",
            value: "`/settings view`, `/settings set-channel`, `/setup`",
            inline: false,
          },
        );

      await interaction.reply({ embeds: [embed], components: [createHelpSelect()] });
      return;
    }

    // Specific module requested
    const embed = getModuleHelpEmbed(mod);
    await interaction.reply({ embeds: [embed], components: [createHelpSelect()] });
  },
};

export function getModuleHelpEmbed(moduleKey: string) {
  const embed = createBaseEmbed(`📚 DevPulse Documentation: ${moduleKey.toUpperCase()}`);

  switch (moduleKey) {
    case "github":
      embed.setDescription(
        "**GitHub Intelligence Suite**\n\n" +
          "• `/github repo <owner/repo>` — Generate comprehensive repository dashboard with activity, focus breakdown, cycle time, and workload.\n" +
          "• `/github commits <owner/repo>` — View recent commit logs and changes.\n" +
          "• `/github prs <owner/repo>` — Track open and merged pull requests.\n" +
          "• `/github issues <owner/repo>` — Track open bugs and discussions.\n" +
          "• `/github releases <owner/repo>` — Inspect release notes and tags.\n\n" +
          "*Tip: Dashboards feature interactive buttons for instant navigation without re-typing commands!*",
      );
      break;

    case "dev":
      embed.setDescription(
        "**Developer Productivity & Telemetry**\n\n" +
          "• `/dev dashboard` — View your personal developer productivity dashboard with observed GitHub activity, workload balance, focus breakdown, and cycle time.\n" +
          "• `/dev link-github <username>` — Bind your GitHub account to your Discord identity for automatic activity tracking.\n" +
          "• `/dev profile [user]` — Inspect public developer profile and statistics.",
      );
      break;

    case "tools":
      embed.setDescription(
        "**Deterministic Developer Toolbox (Zero AI Dependency)**\n\n" +
          "• `/tools json <format|minify|validate> <input>` — Format or validate JSON data.\n" +
          "• `/tools yaml <format|yaml-to-json|json-to-yaml> <input>` — YAML manipulation.\n" +
          "• `/tools jwt <token>` — Inspect JWT headers, payload, algorithms, and expiration.\n" +
          "• `/tools base64 <encode|decode> <input>` — Base64 string codec.\n" +
          "• `/tools hash <sha256|md5|sha1|sha512> <input>` — Cryptographic hashing.\n" +
          "• `/tools uuid [v4|v7]` — UUID generator.\n" +
          "• `/tools regex <pattern> <text>` — Regular expression evaluator.\n" +
          "• `/tools cron <expression>` — Crontab parser with future execution times.\n" +
          "• `/tools timestamp <value>` — Unix timestamp <-> ISO converter.\n" +
          "• `/tools chmod <value>` — Octal and symbolic permissions calculator.\n" +
          "• `/tools semver <v1> <v2>` — Semantic version difference comparator.\n" +
          "• `/tools http <url>` — Safe HTTP requester with strict SSRF protection.\n" +
          "• `/tools dns <domain>` — DNS record resolution (A, AAAA, MX, TXT, NS).\n" +
          "• `/tools ssl <domain>` — SSL certificate expiration and issuer inspector.\n" +
          "• `/tools status <code>` — HTTP status code catalog and RFC descriptions.\n" +
          "• `/tools cheatsheet <git|docker|linux>` — Rapid command reference.",
      );
      break;

    case "security":
      embed.setDescription(
        "**Security Center & Zero-Log Protection**\n\n" +
          "• `/security cve <id>` — Lookup detailed vulnerability advisories in the OSV database.\n" +
          "• `/security package <ecosystem> <name>` — Check open vulnerability advisories for dependencies.\n" +
          "• `/security status` — View active security policies.\n" +
          "• **Automated Secret Scanner**: Automatically scans non-bot messages for leaked GitHub tokens, AWS keys, private keys, database URLs, and bot tokens. Warns immediately with a rotation guide and delete button. Never logs or stores secrets.",
      );
      break;

    case "monitor":
      embed.setDescription(
        "**Website & Synthetic Uptime Monitoring**\n\n" +
          "• `/monitor add <url> [name] [interval]` — Add an endpoint to monitor (pings status, measures latency, checks SSL).\n" +
          "• `/monitor list` — View all configured monitors in this server.\n" +
          "• `/monitor status <id>` — View detailed latency history and sparklines.\n" +
          "• `/monitor remove <id>` — Delete a monitor.",
      );
      break;

    case "trending":
      embed.setDescription(
        "**Trending & Tech News**\n\n" +
          "• `/trending github [language]` — Top trending repositories with high star velocity.\n" +
          "• `/trending technologies` — Fast-growing frameworks, runtimes, and developer engines.\n" +
          "• `/news latest [category]` — Curated headlines from verified RSS/API tech feeds.",
      );
      break;

    case "team":
      embed.setDescription(
        "**Team Collaboration & Project Memory**\n\n" +
          "• `/team standup <today> [blockers]` — Record daily standup with automatic yesterday GitHub telemetry.\n" +
          "• `/team activity` — Team-wide commit throughput and repository health.\n" +
          "• `/remind in <duration> <message>` — Timezone-aware reminders.\n" +
          "• `/project add <name> <stack>` — Register architectural project memory.\n" +
          "• `/project view <name>` — View architectural context.",
      );
      break;

    case "settings":
      embed.setDescription(
        "**Server Settings (Admin Only)**\n\n" +
          "• `/settings view` — View current server configuration.\n" +
          "• `/settings set-channel <channel>` — Set default alert channel.\n" +
          "• `/settings toggle-secrets <enabled>` — Enable/disable secret detection.\n" +
          "• `/settings toggle-ai <enabled>` — Enable/disable optional AI.\n" +
          "• `/settings timezone <tz>` — Configure server default timezone.",
      );
      break;

    default:
      embed.setDescription("Select a module from the dropdown menu below.");
  }

  return embed;
}
