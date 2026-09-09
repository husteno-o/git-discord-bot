import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/**
 * Represents a Discord slash command with metadata and execution logic.
 */
export interface Command {
  /** The slash command builder defining name, description, and options. */
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  /** Executes the command logic when invoked by a user. */
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  /** Optional autocomplete handler for command options. */
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}
