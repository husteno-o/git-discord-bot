import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const issueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("issue")
    .setDescription("GitHub Issue Management: create, close, reopen, and list issues from Discord")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new issue in a repository")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Issue title").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("body").setDescription("Issue description / body").setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("labels")
            .setDescription("Comma-separated labels (e.g. 'bug,urgent')")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt.setName("assignee").setDescription("GitHub username to assign").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("close")
        .setDescription("Close an issue")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Issue number to close").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("comment").setDescription("Close comment").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reopen")
        .setDescription("Reopen a closed issue")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Issue number to reopen").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List issues in a repository")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("state")
            .setDescription("Filter by state")
            .addChoices(
              { name: "Open", value: "open" },
              { name: "Closed", value: "closed" },
              { name: "All", value: "all" },
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View issue details")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Issue number to view").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);

    try {
      if (subcommand === "create") {
        const title = interaction.options.getString("title", true);
        const body = interaction.options.getString("body") || "";
        const labelsStr = interaction.options.getString("labels") || "";
        const assignee = interaction.options.getString("assignee") || undefined;

        const labels = labelsStr
          ? labelsStr.split(",").map((l) => l.trim()).filter(Boolean)
          : [];

        const result = await githubClient.createIssue(repoInput, title, body, labels, assignee);

        const embed = createBaseEmbed(`${NF.issue} Issue Created`)
          .setColor(BrandColors.success)
          .setDescription(
            `**#${result.number}** [${title}](${result.htmlUrl})\n\n` +
              `• **Repo:** \`${repoInput}\`\n` +
              (labels.length > 0 ? `• **Labels:** ${labels.map((l) => `\`${l}\``).join(", ")}\n` : "") +
              (assignee ? `• **Assigned:** @${assignee}\n` : "") +
              (body ? `\n> ${body.slice(0, 200)}${body.length > 200 ? "..." : ""}` : ""),
          )
          .setURL(result.htmlUrl);

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "close") {
        const number = interaction.options.getInteger("number", true);
        const comment = interaction.options.getString("comment") || "Closed via GITBOT";

        const result = await githubClient.closeIssue(repoInput, number, comment);

        const embed = createBaseEmbed(`${NF.check} Issue Closed`)
          .setColor(BrandColors.warning)
          .setDescription(
            `**#${number}** has been closed in \`${repoInput}\`.\n\n` +
              `• **Comment:** ${comment}\n` +
              `• **By:** @${interaction.user.username}`,
          )
          .setURL(result.htmlUrl);

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "reopen") {
        const number = interaction.options.getInteger("number", true);

        const result = await githubClient.reopenIssue(repoInput, number);

        const embed = createBaseEmbed(`${NF.check} Issue Reopened`)
          .setColor(BrandColors.success)
          .setDescription(
            `**#${number}** has been reopened in \`${repoInput}\`.\n\n` +
              `• **By:** @${interaction.user.username}`,
          )
          .setURL(result.htmlUrl);

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "list") {
        const state = (interaction.options.getString("state") || "open") as "open" | "closed" | "all";
        const issues = await githubClient.getIssues(repoInput, state, 15);

        if (issues.length === 0) {
          await interaction.editReply({
            embeds: [
              createBaseEmbed(`${NF.issue} Issues: ${repoInput}`).setDescription(
                `No ${state} issues found in \`${repoInput}\`.`,
              ),
            ],
          });
          return;
        }

        const lines = issues.map((i) => {
          const icon = i.state === "open" ? "🟢" : "🔴";
          return `• ${icon} **#${i.number}** [${i.title.slice(0, 60)}](${i.htmlUrl}) (${i.commentsCount} comments)`;
        });

        const embed = createBaseEmbed(`${NF.issue} ${state.charAt(0).toUpperCase() + state.slice(1)} Issues: ${repoInput}`)
          .setDescription(lines.join("\n"))
          .setFooter({ text: `Showing ${issues.length} issues` });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "view") {
        const number = interaction.options.getInteger("number", true);
        const issue = await githubClient.getSingleIssue(repoInput, number);

        const labels = issue.labels?.join(", ") || "None";

        const embed = createBaseEmbed(`${NF.issue} #${number}: ${issue.title}`)
          .setColor(issue.state === "open" ? BrandColors.success : BrandColors.danger)
          .setDescription(
            (issue.body || "No description provided.").slice(0, 2000),
          )
          .addFields(
            { name: "State", value: `\`${issue.state}\``, inline: true },
            { name: "Labels", value: labels, inline: true },
            { name: "Created", value: `<t:${Math.floor(new Date(issue.createdAt).getTime() / 1000)}:R>`, inline: true },
          )
          .setURL(issue.htmlUrl)
          .setFooter({ text: `GITBOT Issue Viewer • ${repoInput}` });

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