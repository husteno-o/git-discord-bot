import { analyticsService } from "@devpulse/analytics";
import { formatBytes } from "@devpulse/core";
import { db, users } from "@devpulse/database";
import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed, createPersonalDashboardEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const devCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Personal developer productivity, profile, and GitHub linking")
    .addSubcommand((sub) =>
      sub
        .setName("dashboard")
        .setDescription(
          "View your personal developer productivity dashboard (activity, focus, cycle time)",
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("system")
        .setDescription(
          "View DevPulse bot system health, database status, memory stats, and gateway latency",
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("profile")
        .setDescription("Inspect developer profile")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("Discord user to inspect").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("link-github")
        .setDescription("Link your GitHub username to your Discord profile")
        .addStringOption((opt) =>
          opt.setName("username").setDescription("Your GitHub username").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("user") || interaction.user;

    try {
      if (subcommand === "link-github") {
        const ghUsername = interaction.options.getString("username", true).replace(/^@/, "").trim();
        // Verify user exists on GitHub
        const ghUser = await githubClient.getUser(ghUsername);

        // Upsert user in database
        const existing = await db.query.users.findFirst({
          where: eq(users.id, interaction.user.id),
        });

        if (existing) {
          await db
            .update(users)
            .set({
              githubUsername: ghUser.login,
              avatarUrl: interaction.user.displayAvatarURL(),
              updatedAt: new Date(),
            })
            .where(eq(users.id, interaction.user.id));
        } else {
          await db.insert(users).values({
            id: interaction.user.id,
            username: interaction.user.username,
            avatarUrl: interaction.user.displayAvatarURL(),
            githubUsername: ghUser.login,
          });
        }

        const embed = createBaseEmbed("✅ GitHub Account Linked")
          .setColor(BrandColors.success)
          .setDescription(
            `Successfully linked your Discord account to GitHub user **[@${ghUser.login}](${ghUser.htmlUrl})**.\n\nYou can now run \`/dev dashboard\` to see your personal productivity telemetry!`,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "system") {
        const memory = process.memoryUsage();
        const allServers = await db.query.servers.findMany();
        const allRepos = await db.query.repositories.findMany();
        const allMonitors = await db.query.monitors.findMany();

        const uptimeSec = Math.floor(process.uptime());
        const days = Math.floor(uptimeSec / 86400);
        const hours = Math.floor((uptimeSec % 86400) / 3600);
        const minutes = Math.floor((uptimeSec % 3600) / 60);
        const seconds = uptimeSec % 60;
        const uptimeParts: string[] = [];
        if (days > 0) uptimeParts.push(`${days}d`);
        if (hours > 0) uptimeParts.push(`${hours}h`);
        if (minutes > 0) uptimeParts.push(`${minutes}m`);
        uptimeParts.push(`${seconds}s`);
        const uptimeStr = uptimeParts.join(" ");

        const ping = interaction.client.ws.ping;
        const pingStatus = ping < 150 ? "🟢" : ping < 300 ? "🟡" : "🔴";

        const embed = createBaseEmbed("⚡ DevPulse Bot System Telemetry")
          .setColor(BrandColors.primary)
          .setDescription("Live operational status, database health, and memory metrics:")
          .addFields(
            {
              name: "📶 Gateway Latency",
              value: `${pingStatus} \`${ping >= 0 ? `${ping}ms` : "Connecting..."}\``,
              inline: true,
            },
            {
              name: "⏱️ Bot Uptime",
              value: `\`${uptimeStr}\``,
              inline: true,
            },
            {
              name: "🗄️ Database (libSQL)",
              value: "🟢 Connected",
              inline: true,
            },
            {
              name: "🧠 Memory (RSS)",
              value: `\`${formatBytes(memory.rss)}\``,
              inline: true,
            },
            {
              name: "📦 Heap (Used / Total)",
              value: `\`${formatBytes(memory.heapUsed)} / ${formatBytes(memory.heapTotal)}\``,
              inline: true,
            },
            {
              name: "⚡ Runtime",
              value: `\`Bun ${typeof Bun !== "undefined" ? (Bun as any).version : process.version}\``,
              inline: true,
            },
            {
              name: "🌐 Discord Servers",
              value: `\`${interaction.client.guilds.cache.size}\` Connected (\`${allServers.length}\` Registered)`,
              inline: true,
            },
            {
              name: "📡 Tracked Repos",
              value: `\`${allRepos.length}\` Repositories`,
              inline: true,
            },
            {
              name: "🚦 Active Monitors",
              value: `\`${allMonitors.filter((m) => m.isActive).length} / ${allMonitors.length}\` Active`,
              inline: true,
            },
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "dashboard") {
        const stats = await analyticsService.getPersonalDashboard(targetUser.id, 7);
        const embed = createPersonalDashboardEmbed(stats);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "profile") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, targetUser.id),
        });

        const ghUsername = dbUser?.githubUsername || "octocat";
        const ghUser = await githubClient.getUser(ghUsername);

        const embed = createBaseEmbed(`👨‍💻 Profile: ${targetUser.username}`)
          .setThumbnail(ghUser.avatarUrl || targetUser.displayAvatarURL())
          .addFields(
            { name: "GitHub Handle", value: `[@${ghUser.login}](${ghUser.htmlUrl})`, inline: true },
            { name: "Public Repos", value: `${ghUser.publicRepos}`, inline: true },
            { name: "Followers", value: `${ghUser.followers}`, inline: true },
            { name: "Bio", value: ghUser.bio || "No public bio provided", inline: false },
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
