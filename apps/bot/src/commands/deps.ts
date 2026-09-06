import { lookupPackage } from "@devpulse/devtools";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const depsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("deps")
    .setDescription("Package and dependency intelligence (npm, PyPI, Crates.io, Go modules)")
    .addSubcommand((sub) =>
      sub
        .setName("lookup")
        .setDescription("Inspect package metadata, version, license, and security advisories")
        .addStringOption((opt) =>
          opt
            .setName("ecosystem")
            .setDescription("Package Registry")
            .setRequired(true)
            .addChoices(
              { name: "npm (JavaScript/TypeScript)", value: "npm" },
              { name: "PyPI (Python)", value: "pypi" },
              { name: "crates.io (Rust)", value: "crates" },
              { name: "Go Modules (Golang)", value: "go" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("package")
            .setDescription("Package or module name (e.g. fastify, pydantic, tokio)")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const ecosystem = interaction.options.getString("ecosystem", true) as any;
    const packageName = interaction.options.getString("package", true);

    try {
      const pkg = await lookupPackage(ecosystem, packageName);

      const embed = createBaseEmbed(`📦 ${pkg.name}`)
        .setColor(BrandColors.primary)
        .setDescription(pkg.description)
        .addFields(
          { name: "Ecosystem", value: `\`${pkg.ecosystem.toUpperCase()}\``, inline: true },
          { name: "Latest Version", value: `\`${pkg.version}\``, inline: true },
          { name: "License", value: `\`${pkg.license}\``, inline: true },
        );

      if (pkg.dependenciesCount !== undefined) {
        embed.addFields({
          name: "Direct Dependencies",
          value: `\`${pkg.dependenciesCount}\``,
          inline: true,
        });
      }

      if (pkg.repository) {
        embed.addFields({
          name: "Source Repository",
          value: `[${pkg.repository}](${pkg.repository})`,
          inline: false,
        });
      }

      embed.addFields({
        name: "🛡️ Security Advisory Notice",
        value: `*${pkg.securityNotice}*`,
        inline: false,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
