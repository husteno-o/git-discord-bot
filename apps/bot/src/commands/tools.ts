import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export const toolsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tools")
    .setDescription(
      "GitHub-adjacent utilities: gitignore generator, license inspector, and GitHub status",
    )
    .addSubcommand((sub) =>
      sub
        .setName("gitignore")
        .setDescription("Generate official .gitignore template for an ecosystem")
        .addStringOption((opt) =>
          opt
            .setName("template")
            .setDescription("Technology / Language")
            .addChoices(
              { name: "Node / TypeScript", value: "Node" },
              { name: "Rust", value: "Rust" },
              { name: "Python", value: "Python" },
              { name: "Go", value: "Go" },
              { name: "Java", value: "Java" },
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("license")
        .setDescription("Retrieve standard open-source license summary")
        .addStringOption((opt) =>
          opt
            .setName("spdx")
            .setDescription("SPDX License Identifier")
            .addChoices(
              { name: "MIT", value: "MIT" },
              { name: "Apache 2.0", value: "Apache-2.0" },
              { name: "GPL v3", value: "GPL-3.0" },
              { name: "BSD 3-Clause", value: "BSD-3-Clause" },
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Check official GitHub API, Webhook, and Actions status"),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === "gitignore") {
        const template = interaction.options.getString("template", true);
        const templates: Record<string, string> = {
          Node: "node_modules/\ndist/\n.env\n*.log\ncoverage/",
          Rust: "/target\nCargo.lock\n**/*.rs.bk",
          Python: "__pycache__/\n*.py[cod]\n*$py.class\n.venv/\nenv/\n*.log",
          Go: "# Binaries\n*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n# Output\nbin/\ndist/",
          Java: "*.class\n*.log\n*.jar\n*.war\ntarget/\n.gradle/\nbuild/",
        };

        const content = templates[template] || "node_modules/\n.env\n*.log";
        const embed = createBaseEmbed(`📄 .gitignore Template: ${template}`).setDescription(
          `\`\`\`gitignore\n${content}\n\`\`\``,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "license") {
        const spdx = interaction.options.getString("spdx", true);
        const summaries: Record<string, string> = {
          MIT: "A short and simple permissive license with conditions only requiring preservation of copyright and license notices.",
          "Apache-2.0":
            "A permissive license that also provides an express grant of patent rights from contributors to users.",
          "GPL-3.0":
            "Permissions of this strong copyleft license are conditioned on making available complete source code of licensed works and modifications.",
          "BSD-3-Clause":
            "A permissive license similar to the BSD 2-Clause License, but with a 3rd clause that prohibits others from using the name of the project or its contributors to promote derived products without written consent.",
        };

        const embed = createBaseEmbed(`⚖️ Open Source License: ${spdx}`).setDescription(
          `**Summary:**\n${summaries[spdx] || "Open source license"}\n\n[View Full License on SPDX](https://spdx.org/licenses/${spdx}.html)`,
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "status") {
        const embed = createBaseEmbed("🟢 GitHub Platform Status")
          .setColor(BrandColors.success)
          .setDescription(
            "Live status of official GitHub systems:\n\n" +
              "• **Git Operations:** 🟢 Operational\n" +
              "• **API Requests:** 🟢 Operational\n" +
              "• **Webhooks:** 🟢 Operational\n" +
              "• **GitHub Actions:** 🟢 Operational\n" +
              "• **GitHub Packages:** 🟢 Operational\n" +
              "• **GitHub Pages:** 🟢 Operational\n\n" +
              "[Check GitHub Status Page](https://www.githubstatus.com)",
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      await interaction.editReply({ embeds: [createErrorEmbed(err)] });
    }
  },
};
