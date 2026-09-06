import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const askCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription(
      "GitHub Query Assistant: ask natural language questions answered by real GitHub data",
    )
    .addStringOption((opt) =>
      opt
        .setName("question")
        .setDescription(
          "Question to ask (e.g. 'Which PRs waiting > 24h?' or 'Which files changed most?')",
        )
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("repo").setDescription("Repository format 'owner/repo' (optional)"),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const question = interaction.options.getString("question", true);
    const repoInput = interaction.options.getString("repo") || undefined;

    try {
      const result = await githubClient.queryAsk(question, repoInput);

      const embed = createBaseEmbed(`🧠 GitHub Query: "${question}"`)
        .setColor(BrandColors.primary)
        .setDescription(
          `${result.answer}\n\n${result.items ? result.items.join("\n") : ""}\n\n*Answers are computed deterministically from live GitHub repository telemetry.*`,
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
