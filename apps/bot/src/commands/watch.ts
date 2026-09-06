import { db, notifications } from "@devpulse/database";
import { githubClient } from "@devpulse/github";
import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { and, eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const watchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("watch")
    .setDescription(
      "GitHub Watchtower: subscribe to automated alerts for releases, PRs, issues, and security",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("release")
        .setDescription("Watch for new releases and tags published in repository")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Discord channel to post alerts in (defaults to current channel)")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("pr")
        .setDescription("Watch for new pull requests opened in repository")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Discord channel to post alerts in")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("security")
        .setDescription("Watch for security advisories and Dependabot CVE alerts")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Discord channel to post alerts in")
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List all active GitHub Watchtower subscriptions in this server"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove an active watch subscription")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Watch subscription ID to cancel").setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a Discord server.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      if (subcommand === "list") {
        const active = await db.query.notifications.findMany({
          where: eq(notifications.guildId, guildId),
        });

        const lines = active.map(
          (n) =>
            `• \`${n.id.slice(0, 8)}\` — **${n.type.replace("github_", "").toUpperCase()}** for \`${n.target}\` in <#${n.channelId}>`,
        );

        const embed = createBaseEmbed("🚨 GitHub Watchtower Subscriptions").setDescription(
          lines.length > 0
            ? lines.join("\n")
            : "No active watchtower subscriptions configured in this server.",
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "remove") {
        const id = interaction.options.getString("id", true);
        await db
          .delete(notifications)
          .where(and(eq(notifications.guildId, guildId), eq(notifications.id, id)));
        const embed = createBaseEmbed("✅ Watchtower Subscription Removed")
          .setColor(BrandColors.success)
          .setDescription(`Subscription \`${id}\` was successfully removed.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const repoInput = interaction.options.getString("repo", true);
      const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
      const { owner, repo } = githubClient.parseRepoInput(repoInput);
      const fullTarget = `${owner}/${repo}`;

      // Ensure repository is valid on GitHub
      await githubClient.getRepo(fullTarget);

      const typeMap: Record<string, any> = {
        release: "github_release",
        pr: "github_pr",
        security: "security_alert",
      };

      const notifType = typeMap[subcommand];
      const id = `${subcommand}-${Date.now().toString(36)}`;

      await db.insert(notifications).values({
        id,
        guildId,
        channelId: targetChannel!.id,
        type: notifType,
        target: fullTarget,
        isEnabled: true,
      });

      const embed = createBaseEmbed("🚨 Watchtower Subscription Active")
        .setColor(BrandColors.success)
        .setDescription(
          `Now monitoring [**${fullTarget}**](https://github.com/${fullTarget}) for **${subcommand.toUpperCase()}** events!\n\n` +
            `Alerts will be delivered to <#${targetChannel!.id}>.\n*ID: \`${id}\`*`,
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
