import { cache } from "@devpulse/cache";
import { config } from "@devpulse/config";
import { RateLimitError } from "@devpulse/core";
import { computeRepoDashboardMetrics, githubClient } from "@devpulse/github";
import { logger } from "@devpulse/logger";
import {
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  PermissionFlagsBits,
  type StringSelectMenuInteraction,
} from "discord.js";
import { getModuleHelpEmbed } from "../commands/help.js";
import { commandMap } from "../commands/index.js";
import { createRepoNavButtons } from "../ui/components.js";
import {
  createErrorEmbed,
  createRepoCommitsEmbed,
  createRepoDashboardEmbed,
  createRepoIssuesEmbed,
  createRepoPrsEmbed,
  createRepoReleasesEmbed,
} from "../ui/embeds.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  // 1. Slash Command
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
    return;
  }

  // 2. Button Click
  if (interaction.isButton()) {
    await handleButtonClick(interaction);
    return;
  }

  // 3. String Select Menu
  if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
    return;
  }
}

async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commandMap.get(interaction.commandName);
  if (!command) {
    logger.warn({ command: interaction.commandName }, "Command not found in registry");
    return;
  }

  // Rate Limiting
  const rateLimitKey = `user:${interaction.user.id}:${interaction.commandName}`;
  const rateLimit = await cache.checkRateLimit(
    rateLimitKey,
    config.RATE_LIMIT_USER_MAX,
    config.RATE_LIMIT_USER_WINDOW_SEC,
  );

  if (!rateLimit.allowed) {
    const errorEmbed = createErrorEmbed(
      new RateLimitError(
        rateLimit.resetSeconds,
        `Rate limit hit. Please wait ${rateLimit.resetSeconds}s before using this command again.`,
      ),
    );
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
    return;
  }

  const log = logger.child({
    command: interaction.commandName,
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  log.info("Executing slash command");

  try {
    await command.execute(interaction);
  } catch (err: any) {
    log.error({ err }, "Error during command execution");
    const errorEmbed = createErrorEmbed(err);

    if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
    } else if (!interaction.replied) {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
    }
  }
}

async function handleButtonClick(interaction: ButtonInteraction): Promise<void> {
  const [prefix, action, owner, repo, extra] = interaction.customId.split(":");

  // 1. Secret deletion button
  if (prefix === "secret" && action === "delete") {
    const messageId = owner;
    try {
      const channel = interaction.channel;
      if (channel && "messages" in channel) {
        const msg = await channel.messages.fetch(messageId).catch(() => null);
        if (msg) {
          const isAuthor = msg.author.id === interaction.user.id;
          const member = interaction.member;
          const hasPerm =
            member &&
            "permissions" in member &&
            (member.permissions as any).has(PermissionFlagsBits.ManageMessages);

          if (isAuthor || hasPerm) {
            await msg.delete();
            await interaction.reply({
              content: "✅ Leaked message successfully deleted.",
              ephemeral: true,
            });
            return;
          }
        }
      }
      await interaction.reply({
        content: "You do not have permission to delete this message.",
        ephemeral: true,
      });
    } catch (err: any) {
      await interaction.reply({
        content: `Failed to delete message: ${err.message}`,
        ephemeral: true,
      });
    }
    return;
  }

  // 2. PR Action Buttons (Approve / Request Changes / Merge)
  if (prefix === "pr" && owner && repo && extra) {
    await interaction.deferReply({ ephemeral: true });
    const repoInput = `${owner}/${repo}`;
    const prNumber = Number.parseInt(extra, 10);

    try {
      if (action === "approve") {
        await githubClient.createReview(repoInput, prNumber, "APPROVE");
        await interaction.editReply({
          content: `✅ Successfully approved [PR #${prNumber}](https://github.com/${repoInput}/pull/${prNumber})!`,
        });
        return;
      }

      if (action === "request_changes") {
        await githubClient.createReview(
          repoInput,
          prNumber,
          "REQUEST_CHANGES",
          "Changes requested via DevPulse review",
        );
        await interaction.editReply({
          content: `⚠️ Requested changes on [PR #${prNumber}](https://github.com/${repoInput}/pull/${prNumber}).`,
        });
        return;
      }

      if (action === "merge") {
        const result = await githubClient.mergePullRequest(repoInput, prNumber, "merge");
        await interaction.editReply({
          content: `🔀 Successfully merged [PR #${prNumber}](https://github.com/${repoInput}/pull/${prNumber})!\n${result.message || ""}`,
        });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({
        content: `❌ PR Action failed: ${err.message}`,
      });
    }
    return;
  }

  // 3. Home Navigation Buttons
  if (prefix === "home" && action === "nav") {
    await interaction.reply({
      content: `📌 Use \`/repo\`, \`/pr\`, or \`/activity\` for detailed deep-dives.`,
      ephemeral: true,
    });
    return;
  }

  // 4. Repository Navigation Buttons
  if (prefix === "repo" && owner && repo) {
    await interaction.deferUpdate();
    const repoInput = `${owner}/${repo}`;

    try {
      const ghRepo = await githubClient.getRepo(repoInput);

      if (action === "overview") {
        const [commits, prs, issues, releases] = await Promise.all([
          githubClient.getCommits(repoInput, 30).catch(() => []),
          githubClient.getPullRequests(repoInput, "all", 30).catch(() => []),
          githubClient.getIssues(repoInput, "all", 30).catch(() => []),
          githubClient.getReleases(repoInput, 10).catch(() => []),
        ]);

        const metrics = computeRepoDashboardMetrics(commits, prs, issues, releases);
        const embed = createRepoDashboardEmbed(ghRepo, metrics, "overview");
        const components = createRepoNavButtons(owner, repo, "overview");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (action === "commits") {
        const commits = await githubClient.getCommits(repoInput, 15);
        const embed = createRepoCommitsEmbed(ghRepo, commits);
        const components = createRepoNavButtons(owner, repo, "commits");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (action === "prs") {
        const prs = await githubClient.getPullRequests(repoInput, "all", 15);
        const embed = createRepoPrsEmbed(ghRepo, prs);
        const components = createRepoNavButtons(owner, repo, "prs");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (action === "issues") {
        const issues = await githubClient.getIssues(repoInput, "all", 15);
        const embed = createRepoIssuesEmbed(ghRepo, issues);
        const components = createRepoNavButtons(owner, repo, "issues");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }

      if (action === "releases") {
        const releases = await githubClient.getReleases(repoInput, 10);
        const embed = createRepoReleasesEmbed(ghRepo, releases);
        const components = createRepoNavButtons(owner, repo, "releases");
        await interaction.editReply({ embeds: [embed], components });
        return;
      }
    } catch (err: any) {
      await interaction.followUp({ embeds: [createErrorEmbed(err)], ephemeral: true });
    }
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const customId = interaction.customId;
  const selectedValue = interaction.values[0];

  if (customId === "help:category_select") {
    const embed = getModuleHelpEmbed(selectedValue);
    await interaction.update({ embeds: [embed] });
    return;
  }
}
