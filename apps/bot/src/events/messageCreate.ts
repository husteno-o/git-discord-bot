import { db, servers } from "@devpulse/database";
import { computeRepoDashboardMetrics, githubClient } from "@devpulse/github";
import { logger } from "@devpulse/logger";
import { scanForSecrets } from "@devpulse/security";
import type { Message } from "discord.js";
import { eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import {
  createDeleteSecretButton,
  createHelpSelect,
  createRepoNavButtons,
} from "../ui/components.js";
import {
  createBaseEmbed,
  createErrorEmbed,
  createRepoDashboardEmbed,
  createSecurityAlertEmbed,
} from "../ui/embeds.js";

export async function handleMessageCreate(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) return;

  const content = message.content.trim();

  // 1. Text Command: /repo <owner/repo> or !repo <owner/repo>
  if (content.startsWith("/repo") || content.startsWith("!repo")) {
    const parts = content.split(/\s+/);
    const repoArg = parts[1];
    if (repoArg) {
      try {
        const { owner, repo } = githubClient.parseRepoInput(repoArg);
        const ghRepo = await githubClient.getRepo(repoArg);
        const [commits, prs, issues, releases] = await Promise.all([
          githubClient.getCommits(repoArg, 30).catch(() => []),
          githubClient.getPullRequests(repoArg, "all", 30).catch(() => []),
          githubClient.getIssues(repoArg, "all", 30).catch(() => []),
          githubClient.getReleases(repoArg, 10).catch(() => []),
        ]);

        const metrics = computeRepoDashboardMetrics(commits, prs, issues, releases);
        const embed = createRepoDashboardEmbed(ghRepo, metrics, "overview");
        const components = createRepoNavButtons(owner, repo, "overview");

        await message.reply({ embeds: [embed], components });
        return;
      } catch (err: any) {
        await message.reply({ embeds: [createErrorEmbed(err)] });
        return;
      }
    }
  }

  // 2. Text Command: /help or !help
  if (content === "/help" || content === "!help" || content === "help") {
    const embed = createBaseEmbed("DevPulse — GitHub Command Center")
      .setColor(BrandColors.primary)
      .setDescription(
        "Welcome to **DevPulse**, the Discord command center for developers.\n\n" +
          "**Quick Commands:**\n" +
          "• `/repo <owner/repo>` — Repository Intelligence (e.g. `/repo vercel/next.js`)\n" +
          "• `/pr list <repo>` — View pull requests\n" +
          "• `/actions <repo>` — Monitor CI/CD workflows\n" +
          "• `/trending` — Trending GitHub repositories\n" +
          "• `/tools` — Developer utility suite (b64, jwt, hash, cron)\n\n" +
          "Select a module below to view detailed features:",
      );
    const components = [createHelpSelect()];
    await message.reply({ embeds: [embed], components });
    return;
  }

  // 3. Guild-only Secret Scanning
  if (!message.guildId) return;

  try {
    const server = await db.query.servers.findFirst({
      where: eq(servers.id, message.guildId),
    });

    if (server && !server.secretScanningEnabled) {
      return;
    }

    const detected = scanForSecrets(message.content);
    if (detected.length === 0) return;

    logger.warn(
      {
        guildId: message.guildId,
        channelId: message.channelId,
        userId: message.author.id,
        secretType: detected[0].type,
        fingerprint: detected[0].fingerprintHash,
      },
      "Detected potential secret leak in message (credentials NOT logged)",
    );

    const embed = createSecurityAlertEmbed(detected[0]);
    const components = [createDeleteSecretButton(message.id)];

    await message.reply({
      content: `<@${message.author.id}> Security Notice: A sensitive credential pattern was detected in your message!`,
      embeds: [embed],
      components,
    });
  } catch (err) {
    logger.error({ err }, "Error during secret scanning");
  }
}
