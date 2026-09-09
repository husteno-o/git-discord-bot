import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createPrActionButtons } from "../ui/components.js";
import { createBaseEmbed, createDetailedPrEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const prCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("pr")
    .setDescription(
      "Pull Request Power Tools: inspection, checks, reviews, merges, and bottleneck detection",
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("Inspect detailed PR status, line diffs, CI checks, and review bottlenecks")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Pull request number").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List pull requests in repository")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("state")
            .setDescription("PR State (open/closed/all)")
            .addChoices(
              { name: "Open", value: "open" },
              { name: "Closed", value: "closed" },
              { name: "All", value: "all" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("review")
        .setDescription("Submit a review on a pull request")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Pull request number").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("action")
            .setDescription("Review action")
            .addChoices(
              { name: "Approve", value: "APPROVE" },
              { name: "Request Changes", value: "REQUEST_CHANGES" },
              { name: "Comment", value: "COMMENT" },
            )
            .setRequired(true),
        )
        .addStringOption((opt) => opt.setName("comment").setDescription("Review comment message")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("merge")
        .setDescription("Merge a pull request into base branch")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("number").setDescription("Pull request number").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("method")
            .setDescription("Merge strategy")
            .addChoices(
              { name: "Merge Commit", value: "merge" },
              { name: "Squash and Merge", value: "squash" },
              { name: "Rebase and Merge", value: "rebase" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("stale")
        .setDescription("Detect pull requests with no activity for over 14 days")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("waiting")
        .setDescription("Detect pull requests stuck waiting on reviewer feedback > 24 hours")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);

    try {
      const { owner, repo } = githubClient.parseRepoInput(repoInput);

      if (subcommand === "view") {
        const prNumber = interaction.options.getInteger("number", true);
        const detailed = await githubClient.getPullRequest(repoInput, prNumber);
        const embed = createDetailedPrEmbed(detailed, `${owner}/${repo}`);
        const buttons = createPrActionButtons(owner, repo, prNumber, detailed.htmlUrl);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
      }

      if (subcommand === "list") {
        const state =
          (interaction.options.getString("state") as "open" | "closed" | "all") || "open";
        const prs = await githubClient.getPullRequests(repoInput, state, 15);
        const items = prs.map(
          (p) =>
            `• [#${p.number}](${p.htmlUrl}) **${p.title}** (${p.state}) — *by @${p.author.login}*`,
        );

        const embed = createBaseEmbed(
          `${NF.gitPullRequest} Pull Requests: ${owner}/${repo}`,
        ).setDescription(items.length > 0 ? items.join("\n") : "No pull requests found.");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "review") {
        const prNumber = interaction.options.getInteger("number", true);
        const action = interaction.options.getString("action", true) as
          | "APPROVE"
          | "REQUEST_CHANGES"
          | "COMMENT";
        const comment = interaction.options.getString("comment") || undefined;

        await githubClient.createReview(repoInput, prNumber, action, comment);
        const embed = createBaseEmbed(`${NF.check} Review Submitted`)
          .setColor(BrandColors.success)
          .setDescription(
            `Successfully submitted **${action}** on [PR #${prNumber}](https://github.com/${owner}/${repo}/pull/${prNumber}).`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "merge") {
        const prNumber = interaction.options.getInteger("number", true);
        const method =
          (interaction.options.getString("method") as "merge" | "squash" | "rebase") || "merge";

        const res = await githubClient.mergePullRequest(repoInput, prNumber, method);
        const embed = createBaseEmbed(`${NF.gitMerge} Pull Request Merged`)
          .setColor(BrandColors.success)
          .setDescription(
            `PR #${prNumber} successfully merged into base branch using **${method}** strategy.\n${res.message || ""}`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "stale") {
        const stalePrs = await githubClient.getStalePullRequests(repoInput);
        const lines = stalePrs.map(
          (p) => `• [#${p.number}](${p.htmlUrl}) **${p.title}** (Author: @${p.author.login})`,
        );
        const embed = createBaseEmbed(`⏰ Stale Pull Requests (>14d): ${owner}/${repo}`)
          .setColor(stalePrs.length > 0 ? BrandColors.warning : BrandColors.success)
          .setDescription(
            lines.length > 0
              ? `Found **${lines.length} stale PR(s)**:\n\n${lines.join("\n")}`
              : "✅ Zero stale PRs detected in repository!",
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "waiting") {
        const waitingPrs = await githubClient.getWaitingPullRequests(repoInput);
        const lines = waitingPrs.map(
          (p) => `• [#${p.number}](${p.htmlUrl}) **${p.title}** — *waiting on reviewers*`,
        );
        const embed = createBaseEmbed(`⏳ PR Review Bottlenecks (>24h): ${owner}/${repo}`)
          .setColor(waitingPrs.length > 0 ? BrandColors.danger : BrandColors.success)
          .setDescription(
            lines.length > 0
              ? `Found **${lines.length} PR(s)** stuck waiting for review:\n\n${lines.join("\n")}`
              : "✅ All PR reviews are moving with high turnaround velocity!",
          );
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
