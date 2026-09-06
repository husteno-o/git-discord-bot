import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createHelpSelect } from "../ui/components.js";
import { createBaseEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

export function getModuleHelpEmbed(moduleName: string) {
  const map: Record<string, { title: string; desc: string; commands: string }> = {
    repo: {
      title: `${NF.github} Repository Intelligence (/repo)`,
      desc: "Comprehensive insights, health scores, and dependency analysis for any GitHub repository.",
      commands:
        `• \`/repo <owner/repo> [view]\` ${NF.arrowRight} Master repository intelligence dashboard with navigation buttons\n` +
        `• \`/repo <owner/repo> view:health\` ${NF.arrowRight} Health score (0-100) with Activity, CI, and Maintenance bars\n` +
        `• \`/repo <owner/repo> view:dependencies\` ${NF.arrowRight} Dependency graph, manifest check, and package alerts\n` +
        `• \`/repo <owner/repo> view:growth\` ${NF.arrowRight} 30-day velocity, star acceleration, and PR throughput`,
    },
    pr: {
      title: `${NF.gitPullRequest} Pull Request Power Tools (/pr)`,
      desc: "Inspect, review, merge, and unblock pull requests directly from Discord without opening tabs.",
      commands:
        `• \`/pr view <repo> <number>\` ${NF.arrowRight} Detailed status, line diffs, CI checks, cycle time, and action buttons\n` +
        `• \`/pr list <repo> [state]\` ${NF.arrowRight} List open or closed pull requests\n` +
        `• \`/pr review <repo> <number> <action>\` ${NF.arrowRight} Submit review: Approve, Request Changes, or Comment\n` +
        `• \`/pr merge <repo> <number> [method]\` ${NF.arrowRight} 1-click merge with merge, squash, or rebase strategies\n` +
        `• \`/pr stale <repo>\` ${NF.arrowRight} Detect pull requests with no activity for > 14 days\n` +
        `• \`/pr waiting <repo>\` ${NF.arrowRight} Detect pull requests waiting on reviewers for > 24 hours`,
    },
    search: {
      title: `${NF.search} GitHub Power Search Engine (/search)`,
      desc: "Turn Discord into a native GitHub search console with full qualifiers.",
      commands:
        `• \`/search code <query> [repo]\` ${NF.arrowRight} Search code files across repositories\n` +
        `• \`/search issues <query> [repo]\` ${NF.arrowRight} Search issues with qualifiers (e.g. \`auth is:open\`)\n` +
        `• \`/search prs <query> [repo]\` ${NF.arrowRight} Search pull requests (e.g. \`author:@me is:merged\`)\n` +
        `• \`/search repos <query>\` ${NF.arrowRight} Search repositories by stars, language, or topic\n` +
        `• \`/search commits <query> [repo]\` ${NF.arrowRight} Search commit messages across GitHub`,
    },
    code: {
      title: `${NF.terminal} Code Intelligence (/code & /why)`,
      desc: "Inspect file contents, blame lines, and trace the historical reasons for changes.",
      commands:
        `• \`/code view <repo> <path> [ref]\` ${NF.arrowRight} View file contents, line count, and last commit\n` +
        `• \`/code blame <repo> <path> [line]\` ${NF.arrowRight} Inspect line blame: author, commit SHA, and connected PR\n` +
        `• \`/why <repo> <path> [line]\` ${NF.arrowRight} Trace history: File ${NF.arrowRight} Commit ${NF.arrowRight} PR ${NF.arrowRight} Issue ${NF.arrowRight} Decision`,
    },
    investigate: {
      title: `${NF.speedometer} GitHub Investigation (/investigate)`,
      desc: "Connect chronological lifecycle timelines to understand why code was introduced or resolved.",
      commands:
        `• \`/investigate issue <repo> <number>\` ${NF.arrowRight} Builds Issue ${NF.arrowRight} Commit ${NF.arrowRight} PR ${NF.arrowRight} Review ${NF.arrowRight} Merge ${NF.arrowRight} Release timeline\n` +
        `• \`/investigate pr <repo> <number>\` ${NF.arrowRight} Builds PR Opened ${NF.arrowRight} Review ${NF.arrowRight} Fix Commits ${NF.arrowRight} Merge ${NF.arrowRight} Tag timeline`,
    },
    actions: {
      title: `${NF.robot} GitHub Actions Control Center (/actions)`,
      desc: "Visual CI/CD status trees, run history, and workflow reruns.",
      commands:
        `• \`/actions status <repo>\` ${NF.arrowRight} Visual tree: \`main ├── CI ${NF.check} ├── Tests ${NF.check} ├── Build ${NF.cross}\`\n` +
        `• \`/actions runs <repo>\` ${NF.arrowRight} List recent workflow runs with branches and commit SHAs\n` +
        `• \`/actions rerun <repo> <run_id>\` ${NF.arrowRight} Trigger rerun for a failed workflow\n` +
        `• \`/actions cancel <repo> <run_id>\` ${NF.arrowRight} Cancel an in-progress workflow run`,
    },
    security: {
      title: `${NF.shield} GitHub Security Center (/security)`,
      desc: "Dependabot alerts, security advisories, and vulnerable dependency breakdown.",
      commands: `• \`/security audit <repo>\` ${NF.arrowRight} Audit repository for Critical, High, Medium, and Low CVEs`,
    },
    watch: {
      title: `${NF.warning} GitHub Watchtower (/watch)`,
      desc: "Subscribe Discord channels to automated notifications for releases, PRs, and security alerts.",
      commands:
        `• \`/watch release <repo> [channel]\` ${NF.arrowRight} Automatic alert when a new release is published\n` +
        `• \`/watch pr <repo> [channel]\` ${NF.arrowRight} Automatic alert when pull requests are opened\n` +
        `• \`/watch security <repo> [channel]\` ${NF.arrowRight} Automatic alert for new security advisories\n` +
        `• \`/watch list\` ${NF.arrowRight} View all active watch subscriptions in this server\n` +
        `• \`/watch remove <id>\` ${NF.arrowRight} Unsubscribe from a watch`,
    },
  };

  const info = map[moduleName] || map.repo;
  return createBaseEmbed(info.title)
    .setColor(BrandColors.primary)
    .setDescription(`${info.desc}\n\n**Available Commands:**\n${info.commands}`);
}

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Explore GITBOT GitHub Power-User feature sets and command suites"),

  async execute(interaction) {
    const embed = createBaseEmbed(`${NF.github} GITBOT — GitHub Developer Operating System`)
      .setColor(BrandColors.primary)
      .setDescription(
        "Welcome to **GITBOT**, the Discord command center engineered so developers never have to leave chat for GitHub workflows.\n\n" +
          "Select a module from the menu below or execute any power command directly:",
      )
      .addFields(
        {
          name: `${NF.github} 1. Repository Intelligence`,
          value: "`/repo <repository>`, `/repo view:health`, `/repo view:growth`",
          inline: false,
        },
        {
          name: `${NF.gitPullRequest} 2. Pull Request Power Tools`,
          value: "`/pr view`, `/pr list`, `/pr review`, `/pr merge`, `/pr stale`, `/pr waiting`",
          inline: false,
        },
        {
          name: `${NF.search} 3. GitHub Power Search`,
          value:
            "`/search code`, `/search issues`, `/search prs`, `/search repos`, `/search commits`",
          inline: false,
        },
        {
          name: `${NF.terminal} 4. Code Intelligence & History`,
          value: "`/code view`, `/code blame`, `/why <repo> <path> [line]`",
          inline: false,
        },
        {
          name: `${NF.speedometer} 5. GitHub Investigation`,
          value: "`/investigate issue <repo> <num>`, `/investigate pr <repo> <num>`",
          inline: false,
        },
        {
          name: `${NF.clock} 6. Activity & Analytics`,
          value: "`/activity user`, `/activity repo`, `/activity me`, `/team dashboard`",
          inline: false,
        },
        {
          name: `${NF.flame} 7. GitHub Radar & Watchtower`,
          value: "`/trending [language]`, `/watch release`, `/watch pr`, `/watch security`",
          inline: false,
        },
        {
          name: `${NF.robot} 8. Actions & Releases`,
          value: "`/actions status`, `/actions runs`, `/release latest`, `/release notes`",
          inline: false,
        },
        {
          name: `${NF.shield} 9. Security & Authentication`,
          value: "`/security audit`, `/connect github`, `/connect status`, `/home`, `/tools`",
          inline: false,
        },
      );

    const components = [createHelpSelect()];
    await interaction.reply({ embeds: [embed], components });
  },
};
