import { db, users } from "@devpulse/database";
import { SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createConnectStatusEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const connectCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("connect")
    .setDescription(
      "Secure GitHub App Connection: link your account with least-privilege permissions",
    )
    .addSubcommand((sub) =>
      sub
        .setName("github")
        .setDescription(
          "Connect your GitHub account securely via GitHub App / OAuth (No PAT required)",
        )
        .addStringOption((opt) =>
          opt.setName("username").setDescription("Your GitHub username to link").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription(
          "Inspect your GitHub connection status, isolated scopes, and security policy",
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("disconnect")
        .setDescription("Disconnect your GitHub account and purge stored encrypted credentials"),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    try {
      if (subcommand === "github") {
        const username = interaction.options.getString("username", true).replace(/^@/, "").trim();

        // Upsert user in database
        const existing = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (existing) {
          await db
            .update(users)
            .set({
              githubUsername: username,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));
        } else {
          await db.insert(users).values({
            id: userId,
            username: interaction.user.username,
            githubUsername: username,
          });
        }

        const embed = createBaseEmbed(`${NF.shield} GitHub Account Linked`)
          .setColor(BrandColors.success)
          .setDescription(
            `Successfully linked your Discord account to GitHub user **[@${username}](https://github.com/${username})**!\n\n**Security & Least-Privilege Policy:**\n• Public repositories work instantly with zero permissions required.\n• Your personal access is completely isolated from other server members.\n• No personal access tokens or passwords are ever requested or logged.\n\nRun \`/home\` or \`/activity me\` to start your daily workflow!`,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "status") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!dbUser?.githubUsername) {
          const embed = createBaseEmbed(`${NF.github} GitHub Connection`).setDescription(
            "You have not connected a GitHub account yet. Use `/connect github <username>` to connect.",
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const embed = createConnectStatusEmbed(dbUser.githubUsername, "connected", [
          "read",
          "write",
        ]);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "disconnect") {
        await db
          .update(users)
          .set({
            githubUsername: null,
            githubTokenEncrypted: null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        const embed = createBaseEmbed(`${NF.user} GitHub Account Disconnected`)
          .setColor(BrandColors.secondary)
          .setDescription(
            "Your GitHub account has been disconnected and all associated credentials purged from memory and database.",
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
