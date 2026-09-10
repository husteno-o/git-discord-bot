import { githubClient } from "@devpulse/github";
import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createActionsTreeEmbed, createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export const actionsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("actions")
    .setDescription(
      "GitHub Actions Control Center: inspect CI/CD workflows, runs, logs, and trigger reruns",
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View visual CI/CD workflow status tree (CI, Tests, Build, Deploy)")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("runs")
        .setDescription("List recent GitHub Actions workflow runs")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("logs")
        .setDescription("View jobs and step details for a workflow run")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("run_id").setDescription("Workflow run ID to inspect").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("rerun")
        .setDescription("Rerun a workflow run by ID")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("run_id").setDescription("Workflow run ID to trigger").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("cancel")
        .setDescription("Cancel an in-progress workflow run")
        .addStringOption((opt) =>
          opt.setName("repo").setDescription("Repository format 'owner/repo'").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("run_id").setDescription("Workflow run ID to cancel").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();
    const repoInput = interaction.options.getString("repo", true);

    try {
      if (subcommand === "status") {
        const runs = await githubClient.getWorkflowRuns(repoInput, 6);
        const embed = createActionsTreeEmbed(repoInput, runs);
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "runs") {
        const runs = await githubClient.getWorkflowRuns(repoInput, 10);
        const lines = runs.map((r) => {
          const status =
            r.conclusion === "success" ? "✅" : r.conclusion === "failure" ? "❌" : "🟡";
          return `• [\`#${r.runNumber}\`](${r.htmlUrl}) **${r.name}** — ${status} \`${r.conclusion || r.status}\` on \`${r.headBranch}\` (\`${r.headSha.slice(0, 7)}\`)`;
        });

        const embed = createBaseEmbed(
          `${NF.robot} Recent Workflow Runs: ${repoInput}`,
        ).setDescription(lines.length > 0 ? lines.join("\n") : "No recent workflow runs found.");
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "logs") {
        const runId = interaction.options.getInteger("run_id", true);
        const jobs = await githubClient.getWorkflowRunJobs(repoInput, runId);

        if (jobs.length === 0) {
          await interaction.editReply({
            embeds: [createBaseEmbed(`${NF.warning} No Jobs Found`).setDescription(
              `No jobs found for workflow run \`#${runId}\`.`,
            )],
          });
          return;
        }

        const jobLines: string[] = [];
        let failedStep = "";

        for (const job of jobs) {
          const icon =
            job.conclusion === "success"
              ? "✅"
              : job.conclusion === "failure"
                ? "❌"
                : job.conclusion === "cancelled"
                  ? "⚪"
                  : "🟡";

          jobLines.push(`**${icon} ${job.name}** — \`${job.conclusion || job.status}\``);

          if (job.conclusion === "failure" && job.steps) {
            for (const step of job.steps) {
              if (step.conclusion === "failure") {
                failedStep = `${job.name} → Step ${step.number}: ${step.name}`;
                jobLines.push(`  ↳ ❌ **${step.name}** (Step #${step.number})`);
              }
            }
          }
        }

        const embed = createBaseEmbed(`${NF.robot} CI Logs: ${repoInput} #${runId}`)
          .setDescription(jobLines.join("\n"));

        if (failedStep) {
          embed.addFields({
            name: `${NF.warning} Failed Step`,
            value: `\`${failedStep}\``,
            inline: false,
          });
        }

        const failedRun = jobs.find((j) => j.conclusion === "failure");
        if (failedRun) {
          embed.addFields({
            name: `${NF.bug} Diagnosis`,
            value: `**${failedRun.name}** failed. Check the [full logs on GitHub](https://github.com/${repoInput}/actions/runs/${runId}) for step-level details.`,
            inline: false,
          });
        }

        embed.setFooter({ text: `GITBOT CI Log Viewer • ${jobs.length} job(s)` });
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "rerun") {
        const runId = interaction.options.getInteger("run_id", true);
        await githubClient.rerunWorkflow(repoInput, runId);
        const embed = createBaseEmbed(`${NF.spinner} Workflow Rerun Triggered`)
          .setColor(BrandColors.success)
          .setDescription(
            `Successfully triggered rerun for workflow run \`#${runId}\` in \`${repoInput}\`.`,
          );
        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (subcommand === "cancel") {
        const runId = interaction.options.getInteger("run_id", true);
        await githubClient.cancelWorkflow(repoInput, runId);
        const embed = createBaseEmbed(`${NF.cross} Workflow Run Cancelled`)
          .setColor(BrandColors.warning)
          .setDescription(
            `Workflow run \`#${runId}\` in \`${repoInput}\` has been requested to cancel.`,
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