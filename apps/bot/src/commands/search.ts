import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const searchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription(
      "GitHub Power Search Engine: search code, issues, PRs, repositories, and commits",
    )
    .addSubcommand((sub) =>
      sub
        .setName("code")
        .setDescription("Search code across GitHub or within a specific repository")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Code search query (e.g. 'TODO' or 'createClient')")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Scope to repository format 'owner/repo' (optional)"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("issues")
        .setDescription("Search GitHub issues using qualifiers")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Search query (e.g. 'authentication is:open')")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Scope to repository format 'owner/repo' (optional)"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("prs")
        .setDescription("Search pull requests with qualifiers")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Search query (e.g. 'author:@me is:merged')")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Scope to repository format 'owner/repo' (optional)"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("repos")
        .setDescription("Search GitHub repositories")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Search query (e.g. 'rust database stars:>1000')")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("commits")
        .setDescription("Search commits across repositories")
        .addStringOption((opt) =>
          opt
            .setName("query")
            .setDescription("Commit search query (e.g. 'fix auth')")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Scope to repository format 'owner/repo' (optional)"),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const query = interaction.options.getString("query", true);
    const repoInput = interaction.options.getString("repo") || undefined;

    try {
      if (subcommand === "code") {
        const results = await githubClient.searchCode(query, repoInput);
        const lines = results.map(
          (r) => `• [**${r.repository.fullName}**](${r.htmlUrl}) — \`${r.path}\``,
        );
        const embed = createBaseEmbed(`🔎 Code Search: "${query}"`).setDescription(
          lines.length > 0 ? lines.join("\n") : "No matching code files found.",
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "issues") {
        const results = await githubClient.searchIssues(query, repoInput);
        const lines = results.map(
          (i) => `• [#${i.number}](${i.htmlUrl}) **${i.title}** (${i.state}) — *by @${i.author}*`,
        );
        const embed = createBaseEmbed(`🔎 Issue Search: "${query}"`).setDescription(
          lines.length > 0 ? lines.join("\n") : "No matching issues found.",
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "prs") {
        const results = await githubClient.searchPullRequests(query, repoInput);
        const lines = results.map(
          (p) => `• [#${p.number}](${p.htmlUrl}) **${p.title}** (${p.state}) — *by @${p.author}*`,
        );
        const embed = createBaseEmbed(`🔎 Pull Request Search: "${query}"`).setDescription(
          lines.length > 0 ? lines.join("\n") : "No matching pull requests found.",
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "repos") {
        const repos = await githubClient.searchRepositories(query);
        const lines = repos.map(
          (r) =>
            `• [**${r.fullName}**](${r.htmlUrl}) ⭐ \`${r.stars.toLocaleString()}\` — ${r.description ? `${r.description.slice(0, 60)}...` : "No description"}`,
        );
        const embed = createBaseEmbed(`🔎 Repository Search: "${query}"`).setDescription(
          lines.length > 0 ? lines.join("\n") : "No matching repositories found.",
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "commits") {
        const commits = await githubClient.searchCommits(query, repoInput);
        const lines = commits.map(
          (c) =>
            `• [\`${c.sha.slice(0, 7)}\`](${c.htmlUrl}) ${c.message.split("\n")[0]} — *${c.author.name}*`,
        );
        const embed = createBaseEmbed(`🔎 Commit Search: "${query}"`).setDescription(
          lines.length > 0 ? lines.join("\n") : "No matching commits found.",
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
