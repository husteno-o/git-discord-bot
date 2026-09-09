import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createErrorEmbed, createInvestigationEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const investigateCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("investigate")
    .setDescription(
      "GitHub Investigation: trace complete lifecycle timelines (Issue -> Commit -> PR -> Release)",
    )
    .addSubcommand((sub) =>
      sub
        .setName("issue")
        .setDescription("Investigate issue lifecycle, related commits, PRs, and resolution")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Issue number").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("pr")
        .setDescription("Investigate pull request lifecycle, reviews, approvals, and releases")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Pull request number").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);
    const number = interaction.options.getInteger("number", true);

    try {
      if (subcommand === "issue") {
        const timeline = await githubClient.investigateIssue(repoInput, number);
        const embed = createInvestigationEmbed(timeline);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "pr") {
        const timeline = await githubClient.investigatePR(repoInput, number);
        const embed = createInvestigationEmbed(timeline);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: unknown) {
      await interaction.editReply({
        embeds: [createErrorEmbed(err instanceof Error ? err : new Error(String(err)))],
      });
    }
  },
};
