import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createErrorEmbed, createSecurityAuditEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const securityCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("security")
    .setDescription(
      "GitHub Security Center: Dependabot alerts, security advisories, and CVE analysis",
    )
    .addSubcommand((sub) =>
      sub
        .setName("audit")
        .setDescription("Audit repository for security advisories and vulnerable dependencies")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const repoInput = interaction.options.getString("repo", true);

    try {
      const advisories = await githubClient.getSecurityAdvisories(repoInput);
      const embed = createSecurityAuditEmbed(repoInput, advisories);
      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
