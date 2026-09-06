import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createBaseEmbed, createErrorEmbed, createReleaseNotesEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const releaseCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("release")
    .setDescription("Release Manager: latest releases, tag comparison, and automated release notes")
    .addSubcommand((sub) =>
      sub
        .setName("latest")
        .setDescription("View the latest published release and changelog")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("compare")
        .setDescription("Compare changes between two releases or tags")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("base").setDescription("Base tag (e.g. v1.2.0)").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("head").setDescription("Head tag (e.g. v1.3.0)").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("notes")
        .setDescription("Generate clean release notes automatically from merged PRs")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) => opt.setName("from_tag").setDescription("Starting tag (optional)"))
        .addStringOption((opt) =>
          opt.setName("to_tag").setDescription("Target release version (default: vNext)"),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);

    try {
      if (subcommand === "latest") {
        const releases = await githubClient.getReleases(repoInput, 1);
        if (releases.length === 0) {
          const embed = createBaseEmbed(`🏷️ Releases: ${repoInput}`).setDescription(
            "No releases published in this repository yet.",
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const latest = releases[0];
        const bodySnippet = latest.body
          ? `${latest.body.slice(0, 400)}...`
          : "No release notes provided.";
        const embed = createBaseEmbed(`🏷️ Latest Release: ${latest.name} (${latest.tagName})`)
          .setURL(latest.htmlUrl)
          .setDescription(
            `Published: <t:${Math.floor(new Date(latest.publishedAt).getTime() / 1000)}:R>\n\n` +
              `**Changelog Highlights:**\n${bodySnippet}`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "compare") {
        const base = interaction.options.getString("base", true);
        const head = interaction.options.getString("head", true);
        const diff = await githubClient.compareReleases(repoInput, base, head);

        const commitLines = diff.commits
          .slice(0, 8)
          .map(
            (c) =>
              `• [\`${c.sha}\`](${c.htmlUrl}) ${c.message.split("\n")[0]} — *${c.author.name}*`,
          );

        const embed = createBaseEmbed(`🏷️ Compare: ${base}...${head} (${repoInput})`).setDescription(
          `**Summary:** \`${diff.totalCommits}\` commits (${diff.aheadBy} ahead, ${diff.behindBy} behind)\n\n${commitLines.join("\n") || "No differences found between tags."}`,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "notes") {
        const fromTag = interaction.options.getString("from_tag") || undefined;
        const toTag = interaction.options.getString("to_tag") || "vNext";
        const notes = await githubClient.generateReleaseNotes(repoInput, fromTag, toTag);
        const embed = createReleaseNotesEmbed(repoInput, notes);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
