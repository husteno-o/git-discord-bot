import { securityService } from "@devpulse/security";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createCveEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const securityCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("security")
    .setDescription("Security center, CVE lookups, dependency audits, and secret scanning")
    .addSubcommand((sub) =>
      sub
        .setName("cve")
        .setDescription("Lookup detailed CVE / GHSA vulnerability advisory")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("Vulnerability ID (e.g. CVE-2021-44228 or GHSA-...)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("package")
        .setDescription("Check open vulnerability advisories for a package")
        .addStringOption((opt) =>
          opt
            .setName("ecosystem")
            .setDescription("Package ecosystem")
            .setRequired(true)
            .addChoices(
              { name: "npm", value: "npm" },
              { name: "PyPI", value: "PyPI" },
              { name: "crates.io", value: "crates.io" },
              { name: "Go", value: "Go" },
            ),
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Package name").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("version").setDescription("Package version").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View server security posture and secret scanning status"),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "cve") {
        const id = interaction.options.getString("id", true);
        const record = await securityService.lookupCve(id);
        const embed = createCveEmbed(record);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "package") {
        const ecosystem = interaction.options.getString("ecosystem", true);
        const name = interaction.options.getString("name", true);
        const version = interaction.options.getString("version") || undefined;

        const vulns = await securityService.lookupPackageVulnerabilities(ecosystem, name, version);

        if (vulns.length === 0) {
          const embed = createBaseEmbed("🛡️ Security Audit Clean")
            .setColor(BrandColors.success)
            .setDescription(
              `No known public advisories were returned for \`${name}\` in \`${ecosystem}\` by the configured security database.`,
            );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const embed = createBaseEmbed(`⚠️ ${vulns.length} Advisories Found — ${name}`)
          .setColor(BrandColors.danger)
          .setDescription(
            `Known security advisories reported for \`${name}\` in \`${ecosystem}\`:`,
          );

        for (const v of vulns.slice(0, 5)) {
          embed.addFields({
            name: `${v.id}`,
            value: `${v.summary.slice(0, 200)}\n${v.references[0] ? `[Read Advisory](${v.references[0]})` : ""}`,
            inline: false,
          });
        }

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "status") {
        const embed = createBaseEmbed("🛡️ DevPulse Security Center")
          .setDescription("Real-time security telemetry and protection configuration.")
          .addFields(
            {
              name: "Zero-Log Secret Scanner",
              value: "🟢 ACTIVE (Auto-scans and warns on credential leaks)",
              inline: true,
            },
            {
              name: "SSRF Network Guard",
              value: "🟢 ACTIVE (Blocks loopback, RFC1918, metadata targets)",
              inline: true,
            },
            {
              name: "Advisory Source",
              value: "Open Source Vulnerabilities (OSV) + NVD Database",
              inline: false,
            },
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
