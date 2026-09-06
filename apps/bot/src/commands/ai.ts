import { aiProvider } from "@devpulse/ai";
import { db, servers } from "@devpulse/database";
import { SlashCommandBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const aiCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Optional AI-assisted code reviews, explanations, and debugging")
    .addSubcommand((sub) =>
      sub
        .setName("explain")
        .setDescription("Explain a snippet of code, architecture concept, or error message")
        .addStringOption((opt) =>
          opt.setName("prompt").setDescription("What would you like explained?").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("review")
        .setDescription("Request a senior architect code review for a code snippet")
        .addStringOption((opt) =>
          opt.setName("code").setDescription("Code snippet to review").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("debug")
        .setDescription("Diagnose a bug or stack trace")
        .addStringOption((opt) =>
          opt.setName("error").setDescription("Stack trace or bug description").setRequired(true),
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
      // Check server setting for AI
      const server = await db.query.servers.findFirst({
        where: eq(servers.id, guildId),
      });

      if (!server?.aiEnabled && !aiProvider.isEnabled()) {
        const embed = createBaseEmbed("🤖 Optional AI Layer Not Active")
          .setColor(BrandColors.secondary)
          .setDescription(
            "AI features are currently inactive on this instance.\n\n" +
              "DevPulse is built with an **AI-independent core** — all deterministic developer tools (`/tools`), " +
              "GitHub intelligence (`/github`), security centers (`/security`), uptime monitoring (`/monitor`), " +
              "and analytics continue to work without any AI provider configured.\n\n" +
              "*To enable AI, an administrator can configure `AI_PROVIDER` & `AI_API_KEY` in the environment and enable `/settings toggle-ai true`.*",
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "explain") {
        const prompt = interaction.options.getString("prompt", true);
        const response = await aiProvider.generateResponse(prompt, {
          system:
            "You are a staff-level software architect. Explain clearly and concisely with code examples where relevant.",
        });

        const embed = createBaseEmbed("🤖 Architecture Explanation").setDescription(
          response.slice(0, 3900),
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "review") {
        const code = interaction.options.getString("code", true);
        const response = await aiProvider.generateResponse(
          `Please review this code for correctness, edge cases, and performance:\n\n\`\`\`\n${code}\n\`\`\``,
          {
            system:
              "You are a principal engineer conducting a code review. Point out edge cases, security risks, and optimization opportunities.",
          },
        );

        const embed = createBaseEmbed("🤖 Code Review").setDescription(response.slice(0, 3900));
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "debug") {
        const errInput = interaction.options.getString("error", true);
        const response = await aiProvider.generateResponse(
          `Please debug this error trace and provide a fix:\n\n\`\`\`\n${errInput}\n\`\`\``,
          {
            system:
              "You are a debugging expert. Identify the root cause and provide a targeted solution.",
          },
        );

        const embed = createBaseEmbed("🤖 Debugging Diagnosis").setDescription(
          response.slice(0, 3900),
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
