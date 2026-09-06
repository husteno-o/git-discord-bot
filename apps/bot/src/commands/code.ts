import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createBlameEmbed, createCodeViewEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const codeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("code")
    .setDescription(
      "Code Intelligence: file contents, commit history, blame inspection, and linked PRs",
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View file contents, metadata, and last modified commit")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("path").setDescription("Path to file (e.g. src/index.ts)").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("ref").setDescription("Git branch, tag, or commit SHA (default: main)"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("blame")
        .setDescription("Inspect line blame: author, commit SHA, date, and connected pull request")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("path").setDescription("Path to file (e.g. src/auth.ts)").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("line").setDescription("Line number to inspect blame for").setRequired(false),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);
    const path = interaction.options.getString("path", true);

    try {
      if (subcommand === "view") {
        const ref = interaction.options.getString("ref") || undefined;
        const file = await githubClient.getFileContents(repoInput, path, ref);
        const embed = createCodeViewEmbed(repoInput, file);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "blame") {
        const line = interaction.options.getInteger("line") || 1;
        const blames = await githubClient.getBlame(repoInput, path, line);
        const embed = createBlameEmbed(repoInput, path, blames[0]);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
