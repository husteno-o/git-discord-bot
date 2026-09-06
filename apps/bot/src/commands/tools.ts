import {
  DockerCheatSheet,
  GitCheatSheet,
  LinuxCheatSheet,
  base64Decode,
  base64Encode,
  calculateChmod,
  compareSemver,
  convertTimezone,
  decodeJwt,
  formatJson,
  formatSql,
  formatYaml,
  generateHash,
  generateUuid,
  inspectSslCertificate,
  jsonToYaml,
  lookupDns,
  lookupHttpStatus,
  minifyJson,
  parseCronExpression,
  parseTimestamp,
  testHttpRequest,
  testRegex,
  urlDecode,
  urlEncode,
  validateJson,
  yamlToJson,
} from "@devpulse/devtools";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const toolsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tools")
    .setDescription(
      "30+ deterministic offline developer tools (JSON, JWT, Hash, Regex, Cron, Network)",
    )
    .addSubcommand((sub) =>
      sub
        .setName("json")
        .setDescription("Format, minify, or validate JSON")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Operation")
            .setRequired(true)
            .addChoices(
              { name: "Format (Prettify)", value: "format" },
              { name: "Minify", value: "minify" },
              { name: "Validate", value: "validate" },
            ),
        )
        .addStringOption((opt) =>
          opt.setName("input").setDescription("Raw JSON string").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("yaml")
        .setDescription("YAML tools & YAML <-> JSON converter")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Operation")
            .setRequired(true)
            .addChoices(
              { name: "Format", value: "format" },
              { name: "YAML to JSON", value: "yaml-to-json" },
              { name: "JSON to YAML", value: "json-to-yaml" },
            ),
        )
        .addStringOption((opt) =>
          opt.setName("input").setDescription("Input string").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("jwt")
        .setDescription("Inspect and decode JWT (header, payload, expiry, algorithm)")
        .addStringOption((opt) =>
          opt.setName("token").setDescription("Raw JWT token").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("base64")
        .setDescription("Base64 encode or decode string")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Encode or Decode")
            .setRequired(true)
            .addChoices({ name: "Encode", value: "encode" }, { name: "Decode", value: "decode" }),
        )
        .addStringOption((opt) =>
          opt.setName("input").setDescription("Text to process").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("url")
        .setDescription("URL encode or decode string")
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Encode or Decode")
            .setRequired(true)
            .addChoices({ name: "Encode", value: "encode" }, { name: "Decode", value: "decode" }),
        )
        .addStringOption((opt) =>
          opt.setName("input").setDescription("Text to process").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("sql")
        .setDescription("Format and beautify SQL query")
        .addStringOption((opt) =>
          opt.setName("query").setDescription("Raw SQL query").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("timezone")
        .setDescription("Convert time between timezones")
        .addStringOption((opt) =>
          opt
            .setName("time")
            .setDescription("Time string (e.g. '2026-09-07 14:00:00')")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("from")
            .setDescription("Source timezone (e.g. UTC, America/New_York)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("to")
            .setDescription("Target timezone (e.g. Europe/London, Asia/Tokyo)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("hash")
        .setDescription("Generate cryptographic hash")
        .addStringOption((opt) =>
          opt
            .setName("algorithm")
            .setDescription("Hash algorithm")
            .setRequired(true)
            .addChoices(
              { name: "SHA-256", value: "sha256" },
              { name: "MD5", value: "md5" },
              { name: "SHA-1", value: "sha1" },
              { name: "SHA-512", value: "sha512" },
            ),
        )
        .addStringOption((opt) =>
          opt.setName("input").setDescription("String to hash").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("uuid")
        .setDescription("Generate random UUID v4 or time-ordered UUID v7")
        .addStringOption((opt) =>
          opt
            .setName("version")
            .setDescription("UUID Version")
            .addChoices(
              { name: "Version 4 (Random)", value: "v4" },
              { name: "Version 7 (Timestamp)", value: "v7" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("regex")
        .setDescription("Test a regular expression against text")
        .addStringOption((opt) =>
          opt.setName("pattern").setDescription("Regex pattern").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("text").setDescription("Target text").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("flags").setDescription("Flags (e.g. i, m, s)").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("cron")
        .setDescription("Explain cron expression and list next 5 execution occurrences")
        .addStringOption((opt) =>
          opt
            .setName("expression")
            .setDescription("Cron string (e.g. '0 12 * * *')")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("timestamp")
        .setDescription("Convert between Unix timestamp and human dates")
        .addStringOption((opt) =>
          opt
            .setName("value")
            .setDescription("Unix timestamp (seconds or ms) or ISO date")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("chmod")
        .setDescription("Calculate chmod permissions (octal 755 or symbolic rwxr-xr-x)")
        .addStringOption((opt) =>
          opt
            .setName("value")
            .setDescription("Chmod value (e.g. 755, 644, rwxr-xr-x)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("semver")
        .setDescription("Compare two semantic version strings")
        .addStringOption((opt) =>
          opt.setName("v1").setDescription("First version (e.g. 1.2.0)").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("v2").setDescription("Second version (e.g. 1.2.1)").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("http")
        .setDescription("Test HTTP endpoint with latency, status, headers, and SSRF guard")
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Target URL (public)").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("method")
            .setDescription("HTTP Method")
            .addChoices({ name: "GET", value: "GET" }, { name: "HEAD", value: "HEAD" }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("dns")
        .setDescription("Perform DNS lookup for domain")
        .addStringOption((opt) =>
          opt.setName("domain").setDescription("Domain name (e.g. github.com)").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Record Type")
            .addChoices(
              { name: "A", value: "A" },
              { name: "AAAA", value: "AAAA" },
              { name: "CNAME", value: "CNAME" },
              { name: "MX", value: "MX" },
              { name: "TXT", value: "TXT" },
              { name: "NS", value: "NS" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ssl")
        .setDescription("Inspect SSL/TLS certificate expiration, issuer, and validity")
        .addStringOption((opt) =>
          opt.setName("domain").setDescription("Domain name").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("HTTP status code reference and explanation")
        .addIntegerOption((opt) =>
          opt.setName("code").setDescription("HTTP status code (e.g. 404, 502)").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("cheatsheet")
        .setDescription("Developer command quick references for Git, Docker, and Linux")
        .addStringOption((opt) =>
          opt
            .setName("tool")
            .setDescription("Tool")
            .setRequired(true)
            .addChoices(
              { name: "Git", value: "git" },
              { name: "Docker", value: "docker" },
              { name: "Linux", value: "linux" },
            ),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "json") {
        const action = interaction.options.getString("action", true);
        const input = interaction.options.getString("input", true);

        if (action === "format") {
          const res = formatJson(input);
          const embed = createBaseEmbed("🛠️ JSON Formatter").setDescription(
            `\`\`\`json\n${res.slice(0, 3900)}\n\`\`\``,
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        if (action === "minify") {
          const res = minifyJson(input);
          const embed = createBaseEmbed("🛠️ JSON Minifier").setDescription(
            `\`\`\`json\n${res.slice(0, 3900)}\n\`\`\``,
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        if (action === "validate") {
          const res = validateJson(input);
          const embed = createBaseEmbed(res.valid ? "✅ Valid JSON" : "❌ Invalid JSON")
            .setColor(res.valid ? BrandColors.success : BrandColors.danger)
            .setDescription(
              res.valid
                ? `Valid JSON document representing a \`${res.type}\`.`
                : `Parse error: \`${res.error}\``,
            );
          await interaction.editReply({ embeds: [embed] });
          return;
        }
      }

      if (subcommand === "yaml") {
        const action = interaction.options.getString("action", true);
        const input = interaction.options.getString("input", true);

        if (action === "format") {
          const res = formatYaml(input);
          const embed = createBaseEmbed("🛠️ YAML Formatter").setDescription(
            `\`\`\`yaml\n${res.slice(0, 3900)}\n\`\`\``,
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        if (action === "yaml-to-json") {
          const res = yamlToJson(input);
          const embed = createBaseEmbed("🛠️ YAML → JSON").setDescription(
            `\`\`\`json\n${res.slice(0, 3900)}\n\`\`\``,
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }
        if (action === "json-to-yaml") {
          const res = jsonToYaml(input);
          const embed = createBaseEmbed("🛠️ JSON → YAML").setDescription(
            `\`\`\`yaml\n${res.slice(0, 3900)}\n\`\`\``,
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }
      }

      if (subcommand === "jwt") {
        const token = interaction.options.getString("token", true);
        const decoded = decodeJwt(token);

        const embed = createBaseEmbed("🔑 Decoded JSON Web Token")
          .setColor(BrandColors.purple)
          .addFields(
            {
              name: "Header",
              value: `\`\`\`json\n${JSON.stringify(decoded.header, null, 2)}\n\`\`\``,
              inline: false,
            },
            {
              name: "Payload",
              value: `\`\`\`json\n${JSON.stringify(decoded.payload, null, 2).slice(0, 1000)}\n\`\`\``,
              inline: false,
            },
          );

        if (decoded.expiresAt) {
          const status = decoded.isExpired ? "🔴 EXPIRED" : "🟢 VALID";
          embed.addFields({
            name: "Expiration",
            value: `${status} • ${decoded.expiresAt.toUTCString()}`,
            inline: false,
          });
        }
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "base64") {
        const action = interaction.options.getString("action", true);
        const input = interaction.options.getString("input", true);
        const output = action === "encode" ? base64Encode(input) : base64Decode(input);

        const embed = createBaseEmbed(
          `🔤 Base64 ${action === "encode" ? "Encoded" : "Decoded"}`,
        ).setDescription(`\`\`\`\n${output.slice(0, 3900)}\n\`\`\``);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "url") {
        const action = interaction.options.getString("action", true);
        const input = interaction.options.getString("input", true);
        const output = action === "encode" ? urlEncode(input) : urlDecode(input);

        const embed = createBaseEmbed(
          `🔗 URL ${action === "encode" ? "Encoded" : "Decoded"}`,
        ).setDescription(`\`\`\`\n${output.slice(0, 3900)}\n\`\`\``);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "sql") {
        const query = interaction.options.getString("query", true);
        const formatted = formatSql(query);

        const embed = createBaseEmbed("🗄️ Formatted SQL").setDescription(
          `\`\`\`sql\n${formatted.slice(0, 3900)}\n\`\`\``,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "timezone") {
        const time = interaction.options.getString("time", true);
        const from = interaction.options.getString("from", true);
        const to = interaction.options.getString("to", true);
        const res = convertTimezone(time, from, to);

        const embed = createBaseEmbed("🌐 Timezone Conversion").addFields(
          { name: `From (${res.fromTimezone})`, value: `\`${res.original}\``, inline: true },
          { name: `To (${res.toTimezone})`, value: `\`${res.converted}\``, inline: true },
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "hash") {
        const algo = interaction.options.getString("algorithm", true) as any;
        const input = interaction.options.getString("input", true);
        const hash = generateHash(input, algo);

        const embed = createBaseEmbed(`🔒 Hash (${algo.toUpperCase()})`).setDescription(
          `**Input:** \`${input.slice(0, 100)}\`\n**Output:**\n\`\`\`\n${hash}\n\`\`\``,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "uuid") {
        const version = (interaction.options.getString("version") || "v4") as "v4" | "v7";
        const uuid = generateUuid(version);
        const embed = createBaseEmbed("🆔 Generated UUID").setDescription(
          `**Version:** \`${version.toUpperCase()}\`\n**Value:** \`${uuid}\``,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "regex") {
        const pattern = interaction.options.getString("pattern", true);
        const text = interaction.options.getString("text", true);
        const flags = interaction.options.getString("flags") || "g";

        const res = testRegex(pattern, flags, text);
        const embed = createBaseEmbed("🔍 Regex Match Results").addFields(
          { name: "Pattern", value: `\`/${pattern}/${flags}\``, inline: true },
          { name: "Matches Count", value: `\`${res.matchesCount}\``, inline: true },
        );

        if (res.matches.length > 0) {
          const list = res.matches.map((m, idx) => `Match ${idx + 1}: \`${m.match}\``).join("\n");
          embed.addFields({ name: "Sample Matches", value: list, inline: false });
        } else {
          embed.setDescription("No matches found in target text.");
        }

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "cron") {
        const expr = interaction.options.getString("expression", true);
        const res = parseCronExpression(expr, 5);

        const lines = res.nextOccurrences.map(
          (o, idx) => `• Run ${idx + 1}: ${o.discord} (\`${o.iso}\`)`,
        );
        const embed = createBaseEmbed("⏰ Cron Parser").setDescription(
          `**Expression:** \`${res.expression}\`\n\n**Next 5 Occurrences:**\n${lines.join("\n")}`,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "timestamp") {
        const val = interaction.options.getString("value", true);
        const res = parseTimestamp(val);

        const embed = createBaseEmbed("⏱️ Unix Timestamp Converter").addFields(
          { name: "Unix Seconds", value: `\`${res.unixSeconds}\``, inline: true },
          { name: "Unix Milliseconds", value: `\`${res.unixMs}\``, inline: true },
          {
            name: "Discord Format",
            value: `${res.discordFull} (${res.discordRelative})`,
            inline: false,
          },
          { name: "UTC", value: `\`${res.utc}\``, inline: false },
          { name: "ISO 8601", value: `\`${res.iso}\``, inline: false },
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "chmod") {
        const val = interaction.options.getString("value", true);
        const res = calculateChmod(val);

        const embed = createBaseEmbed("📁 Chmod Permissions Calculator")
          .setDescription(`**Octal:** \`${res.octal}\` | **Symbolic:** \`${res.symbolic}\``)
          .addFields(
            {
              name: "User (Owner)",
              value: `Read: ${res.user.read ? "✅" : "❌"} | Write: ${res.user.write ? "✅" : "❌"} | Exec: ${res.user.execute ? "✅" : "❌"}`,
              inline: false,
            },
            {
              name: "Group",
              value: `Read: ${res.group.read ? "✅" : "❌"} | Write: ${res.group.write ? "✅" : "❌"} | Exec: ${res.group.execute ? "✅" : "❌"}`,
              inline: false,
            },
            {
              name: "Others",
              value: `Read: ${res.others.read ? "✅" : "❌"} | Write: ${res.others.write ? "✅" : "❌"} | Exec: ${res.others.execute ? "✅" : "❌"}`,
              inline: false,
            },
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "semver") {
        const v1 = interaction.options.getString("v1", true);
        const v2 = interaction.options.getString("v2", true);
        const res = compareSemver(v1, v2);

        const embed = createBaseEmbed("🏷️ Semver Comparator").setDescription(
          `**${res.message}**\n\nChange classification: \`${res.diff.toUpperCase()}\``,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "http") {
        const url = interaction.options.getString("url", true);
        const method = (interaction.options.getString("method") || "GET") as "GET" | "HEAD";

        const res = await testHttpRequest(url, method);
        const embed = createBaseEmbed("🌐 HTTP Request Tester").addFields(
          { name: "Target URL", value: `\`${res.url}\``, inline: false },
          { name: "Status", value: `\`${res.statusCode} ${res.statusText}\``, inline: true },
          { name: "Latency", value: `\`${res.responseTimeMs}ms\``, inline: true },
        );

        if (res.bodySnippet) {
          embed.addFields({
            name: "Response Body Snippet",
            value: `\`\`\`\n${res.bodySnippet.slice(0, 950)}\n\`\`\``,
            inline: false,
          });
        }
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "dns") {
        const domain = interaction.options.getString("domain", true);
        const type = (interaction.options.getString("type") || "A") as any;

        const res = await lookupDns(domain, type);
        const recordsList =
          res.records.length > 0
            ? res.records.map((r) => `• \`${r}\``).join("\n")
            : "No records found";

        const embed = createBaseEmbed(`🌐 DNS Lookup (${res.recordType})`).setDescription(
          `Domain: **${res.hostname}**\n\n${recordsList}`,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "ssl") {
        const domain = interaction.options.getString("domain", true);
        const cert = await inspectSslCertificate(domain);

        const statusStr = cert.isValid ? "🟢 VALID" : "🔴 INVALID / EXPIRED";
        const embed = createBaseEmbed(`🔒 SSL Certificate — ${cert.domain}`)
          .setColor(cert.isValid ? BrandColors.success : BrandColors.danger)
          .addFields(
            { name: "Status", value: statusStr, inline: true },
            { name: "Days Remaining", value: `\`${cert.daysRemaining} days\``, inline: true },
            { name: "Issuer", value: `\`${cert.issuer}\``, inline: false },
            {
              name: "Valid Until",
              value: `\`${new Date(cert.validTo).toUTCString()}\``,
              inline: false,
            },
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "status") {
        const code = interaction.options.getInteger("code", true);
        const res = lookupHttpStatus(code);

        const embed = createBaseEmbed(`📄 HTTP ${res.code} — ${res.name}`).setDescription(
          res.description,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "cheatsheet") {
        const tool = interaction.options.getString("tool", true);
        const sheet =
          tool === "git" ? GitCheatSheet : tool === "docker" ? DockerCheatSheet : LinuxCheatSheet;

        const lines = Object.entries(sheet)
          .map(([k, v]) => `**${k.replace(/_/g, " ").toUpperCase()}**\n\`\`\`bash\n${v}\n\`\`\``)
          .join("\n");

        const embed = createBaseEmbed(
          `⚡ ${tool.toUpperCase()} Developer Cheat Sheet`,
        ).setDescription(lines);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
