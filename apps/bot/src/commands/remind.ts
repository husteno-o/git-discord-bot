import { reminderService } from "@devpulse/scheduler";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

function parseDurationMs(input: string): number | null {
  const match = input.trim().match(/^(\d+)\s*([smhdw])$/i);
  if (!match) return null;
  const val = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    case "w":
      return val * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export const remindCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Timezone-aware reminders and recurring developer alerts")
    .addSubcommand((sub) =>
      sub
        .setName("in")
        .setDescription("Set a reminder relative to now (e.g. '2h', '30m', '1d')")
        .addStringOption((opt) =>
          opt
            .setName("duration")
            .setDescription("Time offset (e.g. 10m, 2h, 1d)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("message").setDescription("Reminder note").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List your active pending reminders"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("cancel")
        .setDescription("Cancel an active reminder")
        .addStringOption((opt) =>
          opt.setName("id").setDescription("Reminder ID").setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be executed in a Discord server.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      if (subcommand === "in") {
        const durationStr = interaction.options.getString("duration", true);
        const message = interaction.options.getString("message", true);

        const ms = parseDurationMs(durationStr);
        if (!ms) {
          throw new Error(`Invalid duration format '${durationStr}'. Examples: '30m', '2h', '1d'.`);
        }

        const dueAt = new Date(Date.now() + ms);
        const rem = await reminderService.addReminder(
          guildId,
          interaction.channelId,
          interaction.user.id,
          message,
          dueAt,
        );

        const embed = createBaseEmbed("⏰ Reminder Scheduled")
          .setColor(BrandColors.success)
          .setDescription(
            `I will remind you <t:${Math.floor(dueAt.getTime() / 1000)}:R> on <t:${Math.floor(dueAt.getTime() / 1000)}:f>.\n\n` +
              `**Note:** ${message}\n` +
              `**ID:** \`${rem.id}\``,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "list") {
        const list = await reminderService.listReminders(guildId, interaction.user.id);

        if (list.length === 0) {
          const embed = createBaseEmbed("⏰ Active Reminders").setDescription(
            "You have no pending reminders.",
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const embed = createBaseEmbed(`⏰ Active Reminders (${list.length})`);
        for (const r of list.slice(0, 10)) {
          const dueTimestamp = Math.floor(new Date(r.dueAt).getTime() / 1000);
          embed.addFields({
            name: `ID: \`${r.id.slice(0, 8)}\``,
            value: `• **Due:** <t:${dueTimestamp}:R> (<t:${dueTimestamp}:f>)\n• **Message:** ${r.message}`,
            inline: false,
          });
        }

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "cancel") {
        const id = interaction.options.getString("id", true);
        await reminderService.cancelReminder(guildId, id);

        const embed = createBaseEmbed("🗑️ Reminder Cancelled")
          .setColor(BrandColors.success)
          .setDescription(`Successfully cancelled reminder with ID \`${id}\`.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
