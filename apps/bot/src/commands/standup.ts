import { db, standups, users } from "@devpulse/database";
import { SlashCommandBuilder } from "discord.js";
import { and, eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const standupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("standup")
    .setDescription("Daily Standup: log what you did, what you'll do, and any blockers")
    .addSubcommand((sub) =>
      sub
        .setName("submit")
        .setDescription("Submit your daily standup update")
        .addStringOption((opt) =>
          opt
            .setName("yesterday")
            .setDescription("What you did yesterday (comma-separated list)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("today")
            .setDescription("What you plan to do today")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("blockers")
            .setDescription("Any blockers or issues (optional)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View today's standup for the team")
        .addStringOption((opt) =>
          opt
            .setName("date")
            .setDescription("Date to view (YYYY-MM-DD, defaults to today)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("history")
        .setDescription("View your recent standup history")
        .addIntegerOption((opt) =>
          opt
            .setName("days")
            .setDescription("Number of days to look back (default 7)")
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: `${NF.cross} This command can only be used in a Discord server.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const today = new Date().toISOString().split("T")[0];

    try {
      if (subcommand === "submit") {
        const yesterdayStr = interaction.options.getString("yesterday", true);
        const todayPlan = interaction.options.getString("today", true);
        const blockers = interaction.options.getString("blockers") || null;

        const yesterdayItems = yesterdayStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        // Upsert standup
        const existing = await db.query.standups.findFirst({
          where: and(
            eq(standups.guildId, guildId),
            eq(standups.userId, interaction.user.id),
            eq(standups.date, today),
          ),
        });

        if (existing) {
          await db
            .update(standups)
            .set({
              yesterdayActivity: yesterdayItems,
              todayPlan,
              blockers,
            })
            .where(eq(standups.id, existing.id));
        } else {
          await db.insert(standups).values({
            id: crypto.randomUUID(),
            guildId,
            userId: interaction.user.id,
            date: today,
            yesterdayActivity: yesterdayItems,
            todayPlan,
            blockers,
          });
        }

        const embed = createBaseEmbed(`${NF.check} Standup Submitted`)
          .setColor(BrandColors.success)
          .setDescription(
            `**Standup for ${today}** submitted by ${interaction.user.toString()}\n\n` +
              `**📋 Yesterday:**\n${yesterdayItems.map((i) => `• ${i}`).join("\n")}\n\n` +
              `**🎯 Today:**\n• ${todayPlan}\n\n` +
              (blockers ? `**🚧 Blockers:**\n• ${blockers}\n\n` : "") +
              `_Use /standup view to see the team's standups._`,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "view") {
        const date = interaction.options.getString("date") || today;

        const dayStandups = await db.query.standups.findMany({
          where: and(eq(standups.guildId, guildId), eq(standups.date, date)),
        });

        if (dayStandups.length === 0) {
          await interaction.editReply({
            embeds: [
              createBaseEmbed(`${NF.clipboard} Standup: ${date}`).setDescription(
                `No standups submitted for **${date}**.\n\nUse \`/standup submit\` to log your update.`,
              ),
            ],
          });
          return;
        }

        const lines: string[] = [];
        for (const s of dayStandups) {
          const user = await db.query.users.findFirst({
            where: eq(users.id, s.userId),
          });
          const name = user?.username || s.userId;
          const yesterday = (s.yesterdayActivity as string[]) || [];
          lines.push(
            `**@${name}**\n` +
              `• Yesterday: ${yesterday.join(", ") || "N/A"}\n` +
              `• Today: ${s.todayPlan}\n` +
              (s.blockers ? `• 🚧 Blockers: ${s.blockers}` : ""),
          );
        }

        const embed = createBaseEmbed(`${NF.clipboard} Team Standup: ${date}`)
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: `${dayStandups.length} standup(s) submitted` });

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "history") {
        const days = interaction.options.getInteger("days") || 7;
        const userId = interaction.user.id;

        const history = await db.query.standups.findMany({
          where: and(eq(standups.guildId, guildId), eq(standups.userId, userId)),
          orderBy: (s, { desc }) => [desc(s.date)],
          limit: days,
        });

        if (history.length === 0) {
          await interaction.editReply({
            embeds: [
              createBaseEmbed(`${NF.clipboard} Your Standup History`).setDescription(
                "No standups found. Use `/standup submit` to get started!",
              ),
            ],
          });
          return;
        }

        const lines = history.map((s) => {
          const yesterday = (s.yesterdayActivity as string[]) || [];
          return `**${s.date}**\n• Yesterday: ${yesterday.slice(0, 3).join(", ") || "N/A"}\n• Today: ${s.todayPlan.slice(0, 80)}${s.todayPlan.length > 80 ? "..." : ""}${s.blockers ? `\n• 🚧 ${s.blockers}` : ""}`;
        });

        const embed = createBaseEmbed(`${NF.clipboard} Your Standup History`)
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: `Last ${history.length} standups` });

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