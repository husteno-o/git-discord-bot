import type { ChatInputCommandInteraction } from "discord.js";
import { createErrorEmbed } from "../ui/embeds.js";

export type CommandExecutor = (interaction: ChatInputCommandInteraction) => Promise<void>;

export function withErrorHandling(executor: CommandExecutor): CommandExecutor {
  return async (interaction: ChatInputCommandInteraction) => {
    try {
      await executor(interaction);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const embed = createErrorEmbed(error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch {
        // Ignore reply failures — interaction may have expired
      }
    }
  };
}
