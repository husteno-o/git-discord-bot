import { db, projects, users } from "@devpulse/database";
import { SlashCommandBuilder } from "discord.js";
import { and, eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const projectCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("project")
    .setDescription("Project memory and architecture context repository")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Register a new project context in this server")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Project name").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("description").setDescription("Short description").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("stack")
            .setDescription("Comma-separated tech stack (e.g. Bun, TypeScript, Fastify)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("repository")
            .setDescription("Primary GitHub repository URL")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("database")
            .setDescription("Database engine (e.g. Turso, PostgreSQL)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all architectural projects in this server"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View comprehensive architectural overview of a project")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Project name").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Delete a project from project memory")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Project name").setRequired(true),
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
      if (subcommand === "add") {
        const name = interaction.options.getString("name", true);
        const description = interaction.options.getString("description", true);
        const stackRaw = interaction.options.getString("stack", true);
        const repo = interaction.options.getString("repository");
        const databaseType = interaction.options.getString("database");

        const stack = stackRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const repositories = repo ? [repo.trim()] : [];

        // Ensure user exists
        await db
          .insert(users)
          .values({
            id: interaction.user.id,
            username: interaction.user.username,
          })
          .onConflictDoNothing();

        const id = crypto.randomUUID();
        await db.insert(projects).values({
          id,
          guildId,
          name,
          description,
          stack,
          repositories,
          databaseType,
          createdBy: interaction.user.id,
        });

        const embed = createBaseEmbed("✅ Project Registered")
          .setColor(BrandColors.success)
          .setDescription(
            `Successfully registered project **${name}** in server memory.\n\nRun \`/project view ${name}\` to view full architectural specification.`,
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "list") {
        const list = await db.query.projects.findMany({
          where: eq(projects.guildId, guildId),
        });

        if (list.length === 0) {
          const embed = createBaseEmbed("📁 Server Projects").setDescription(
            "No projects saved yet. Add one with `/project add`.",
          );
          await interaction.editReply({ embeds: [embed] });
          return;
        }

        const embed = createBaseEmbed(`📁 Server Projects (${list.length})`);
        for (const p of list) {
          embed.addFields({
            name: `📦 ${p.name}`,
            value: `${p.description || "No description"}\n**Stack:** ${(p.stack as string[])?.join(", ") || "N/A"}`,
            inline: false,
          });
        }

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "view") {
        const name = interaction.options.getString("name", true);
        const proj = await db.query.projects.findFirst({
          where: and(eq(projects.guildId, guildId), eq(projects.name, name)),
        });

        if (!proj) {
          throw new Error(`Project '${name}' was not found in this server.`);
        }

        const embed = createBaseEmbed(`📦 Project: ${proj.name}`)
          .setDescription(proj.description || "No description provided.")
          .addFields(
            {
              name: "Tech Stack",
              value: (proj.stack as string[])?.join(" • ") || "None",
              inline: false,
            },
            { name: "Database", value: proj.databaseType || "Not specified", inline: true },
            { name: "Runtime", value: proj.runtime || "Bun / Node.js", inline: true },
            {
              name: "Repositories",
              value: (proj.repositories as string[])?.join("\n") || "None connected",
              inline: false,
            },
          );

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "remove") {
        const name = interaction.options.getString("name", true);
        await db
          .delete(projects)
          .where(and(eq(projects.guildId, guildId), eq(projects.name, name)));

        const embed = createBaseEmbed("🗑️ Project Removed")
          .setColor(BrandColors.success)
          .setDescription(`Successfully removed project **${name}**.`);
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
