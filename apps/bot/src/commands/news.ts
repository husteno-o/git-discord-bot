import { type NewsCategory, newsService } from "@devpulse/news";
import { SlashCommandBuilder } from "discord.js";
import { createNewsCategorySelect } from "../ui/components.js";
import { createErrorEmbed, createNewsEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const newsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("news")
    .setDescription("Curated developer news headlines from verified tech sources")
    .addSubcommand((sub) =>
      sub
        .setName("latest")
        .setDescription("Browse latest developer news headlines")
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("News topic")
            .setRequired(false)
            .addChoices(
              { name: "Developer & Architecture", value: "developer" },
              { name: "Security & Advisories", value: "security" },
              { name: "GitHub & Open Source", value: "github" },
              { name: "AI & Machine Learning", value: "ai" },
              { name: "Cloud & DevOps", value: "cloud" },
              { name: "Databases", value: "databases" },
              { name: "Web Development", value: "web" },
              { name: "Rust", value: "rust" },
              { name: "Go", value: "go" },
              { name: "TypeScript", value: "typescript" },
              { name: "Python", value: "python" },
            ),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const category = (interaction.options.getString("category") || "developer") as NewsCategory;

    try {
      const items = await newsService.getLatestNews(category, 5);
      const embed = createNewsEmbed(items, category);
      const components = [createNewsCategorySelect()];

      await interaction.editReply({ embeds: [embed], components });
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
