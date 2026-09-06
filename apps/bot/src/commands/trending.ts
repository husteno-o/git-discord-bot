import { trendingService } from "@devpulse/trending";
import { SlashCommandBuilder } from "discord.js";
import { createErrorEmbed, createTrendingEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const trendingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("trending")
    .setDescription("Explore trending GitHub repositories and fast-growing technologies")
    .addSubcommand((sub) =>
      sub
        .setName("github")
        .setDescription("View trending repositories on GitHub")
        .addStringOption((opt) =>
          opt
            .setName("language")
            .setDescription("Filter by programming language (e.g. rust, typescript, python, go)")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("period")
            .setDescription("Time window")
            .setRequired(false)
            .addChoices({ name: "Today", value: "today" }, { name: "This Week", value: "weekly" }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("technologies")
        .setDescription("View fastest growing developer technologies and frameworks"),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "github") {
        const language = interaction.options.getString("language") || undefined;
        const period = (interaction.options.getString("period") || "today") as "today" | "weekly";

        const repos = await trendingService.getTrendingRepositories(language, period);
        const embed = createTrendingEmbed(repos, [], "repositories");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "technologies") {
        const tech = trendingService.getTrendingTechnologies();
        const embed = createTrendingEmbed([], tech, "technologies");
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
