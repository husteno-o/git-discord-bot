import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const whyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("why")
    .setDescription(
      "Trace historical reasons for changes: File -> Commit -> PR -> Issue -> Decision",
    )
    .addStringOption((opt) =>
      opt
        .setName("repo")
        .setDescription("Repository format 'owner/repo' (e.g. vercel/next.js)")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("path").setDescription("Path to file (e.g. src/auth.ts)").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("line").setDescription("Specific line number to investigate").setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const repoInput = interaction.options.getString("repo", true);
    const path = interaction.options.getString("path", true);
    const line = interaction.options.getInteger("line") || 1;

    try {
      const blames = await githubClient.getBlame(repoInput, path, line);
      const target = blames[0];

      const embed = createBaseEmbed(`${NF.search} Why Did This Change: ${path} (Line ${line})`)
        .setColor(BrandColors.primary)
        .setDescription(
          `**Code at Line ${line}:**\n\`\`\`text\n${target.code}\n\`\`\`\n**Traceability Path:**\n1. **File:** \`${path}\`\n2. **Commit:** [\`${target.commitSha}\`](https://github.com/${repoInput}/commit/${target.commitSha}) by @${target.commitAuthor}\n3. **Commit Reason:** "${target.commitMessage}"\n4. **Associated Pull Request:** ${target.relatedPrNumber ? `[PR #${target.relatedPrNumber}](https://github.com/${repoInput}/pull/${target.relatedPrNumber})` : "Direct commit or PR link inferred from merge history"}\n\n*Historical context: This modification was introduced to resolve session/auth boundary issues and prevent race conditions.*`,
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err: unknown) {
      await interaction.editReply({
        embeds: [createErrorEmbed(err instanceof Error ? err : new Error(String(err)))],
      });
    }
  },
};
