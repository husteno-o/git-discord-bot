import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createHelpSelect } from "../ui/components.js";
import { createBaseEmbed } from "../ui/embeds.js";
import type { Command } from "./types.js";

export function getModuleHelpEmbed(moduleName: string) {
  const map: Record<string, { title: string; desc: string; commands: string }> = {
    repo: {
      title: "📊 Repository Intelligence (/repo)",
      desc: "Comprehensive insights, health scores, and dependency analysis for any GitHub repository.",
      commands:
        "• `/repo view <owner/repo>` — Master repository intelligence dashboard with navigation buttons\n" +
        "• `/repo health <owner/repo>` — Health score (0-100) with Activity, CI, Maintenance, and Community bars\n" +
        "• `/repo dependencies <owner/repo>` — Dependency graph, manifest check, and outdated package alerts\n" +
        "• `/repo growth <owner/repo>` — 30-day velocity, star acceleration, and PR throughput",
    },
    pr: {
      title: "🔀 Pull Request Power Tools (/pr)",
      desc: "Inspect, review, merge, and unblock pull requests directly from Discord without opening tabs.",
      commands:
        "• `/pr view <repo> <number>` — Detailed status, line diffs, CI checks, cycle time, and action buttons\n" +
        "• `/pr list <repo> [state]` — List open or closed pull requests\n" +
        "• `/pr review <repo> <number> <action>` — Submit review: Approve, Request Changes, or Comment\n" +
        "• `/pr merge <repo> <number> [method]` — 1-click merge with merge, squash, or rebase strategies\n" +
        "• `/pr stale <repo>` — Detect pull requests with no activity for > 14 days\n" +
        "• `/pr waiting <repo>` — Detect pull requests waiting on reviewers for > 24 hours",
    },
    search: {
      title: "🔎 GitHub Power Search Engine (/search)",
      desc: "Turn Discord into a native GitHub search console with full qualifiers.",
      commands:
        "• `/search code <query> [repo]` — Search code files across repositories\n" +
        "• `/search issues <query> [repo]` — Search issues with qualifiers (e.g. `auth is:open`)\n" +
        "• `/search prs <query> [repo]` — Search pull requests (e.g. `author:@me is:merged`)\n" +
        "• `/search repos <query>` — Search repositories by stars, language, or topic\n" +
        "• `/search commits <query> [repo]` — Search commit messages across GitHub",
    },
    code: {
      title: "🧠 Code Intelligence (/code & /why)",
      desc: "Inspect file contents, blame lines, and trace the historical reasons for changes.",
      commands:
        "• `/code view <repo> <path> [ref]` — View file contents, line count, and last commit\n" +
        "• `/code blame <repo> <path> [line]` — Inspect line blame: author, commit SHA, and connected PR\n" +
        "• `/why <repo> <path> [line]` — Trace history: File → Commit → PR → Issue → Decision",
    },
    investigate: {
      title: "🕵️ GitHub Investigation (/investigate)",
      desc: "Connect chronological lifecycle timelines to understand why code was introduced or resolved.",
      commands:
        "• `/investigate issue <repo> <number>` — Builds Issue → Commit → PR → Review → Merge → Release timeline\n" +
        "• `/investigate pr <repo> <number>` — Builds PR Opened → Review → Fix Commits → Merge → Tag timeline",
    },
    actions: {
      title: "⚙️ GitHub Actions Control Center (/actions)",
      desc: "Visual CI/CD status trees, run history, and workflow reruns.",
      commands:
        "• `/actions status <repo>` — Visual tree: `main ├── CI ✅ ├── Tests ✅ ├── Build ❌`\n" +
        "• `/actions runs <repo>` — List recent workflow runs with branches and commit SHAs\n" +
        "• `/actions rerun <repo> <run_id>` — Trigger rerun for a failed workflow\n" +
        "• `/actions cancel <repo> <run_id>` — Cancel an in-progress workflow run",
    },
    security: {
      title: "🛡️ GitHub Security Center (/security)",
      desc: "Dependabot alerts, security advisories, and vulnerable dependency breakdown.",
      commands:
        "• `/security audit <repo>` — Audit repository for Critical, High, Medium, and Low CVEs",
    },
    watch: {
      title: "🚨 GitHub Watchtower (/watch)",
      desc: "Subscribe Discord channels to automated notifications for releases, PRs, and security alerts.",
      commands:
        "• `/watch release <repo> [channel]` — Automatic alert when a new release is published\n" +
        "• `/watch pr <repo> [channel]` — Automatic alert when pull requests are opened\n" +
        "• `/watch security <repo> [channel]` — Automatic alert for new security advisories\n" +
        "• `/watch list` — View all active watch subscriptions in this server\n" +
        "• `/watch remove <id>` — Unsubscribe from a watch",
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
    .setDescription("Explore DevPulse GitHub Power-User feature sets and command suites"),

  async execute(interaction) {
    const embed = createBaseEmbed("🐙 DevPulse — GitHub Power-User Operating System")
      .setColor(BrandColors.primary)
      .setDescription(
        "Welcome to **DevPulse**, the Discord command center engineered so developers don't need to open GitHub for their daily work.\n\n" +
          "Explore features using the menu below, or run any of the core power suites:",
      )
      .addFields(
        {
          name: "📊 1. Repository Intelligence",
          value: "`/repo view`, `/repo health`, `/repo dependencies`, `/repo growth`",
          inline: false,
        },
        {
          name: "🔀 2. Pull Request Power Tools",
          value: "`/pr view`, `/pr list`, `/pr review`, `/pr merge`, `/pr stale`, `/pr waiting`",
          inline: false,
        },
        {
          name: "🔎 3. GitHub Power Search",
          value:
            "`/search code`, `/search issues`, `/search prs`, `/search repos`, `/search commits`",
          inline: false,
        },
        {
          name: "🧠 4. Code Intelligence & History",
          value: "`/code view`, `/code blame`, `/why <repo> <path> [line]`",
          inline: false,
        },
        {
          name: "🕵️ 5. GitHub Investigation",
          value: "`/investigate issue <repo> <num>`, `/investigate pr <repo> <num>`",
          inline: false,
        },
        {
          name: "📈 6. Activity & Analytics",
          value: "`/activity user`, `/activity repo`, `/activity me`, `/team dashboard`",
          inline: false,
        },
        {
          name: "🔥 7. GitHub Radar & Watchtower",
          value: "`/trending [language]`, `/watch release`, `/watch pr`, `/watch security`",
          inline: false,
        },
        {
          name: "⚙️ 8. Actions & Releases",
          value: "`/actions status`, `/actions runs`, `/release latest`, `/release notes`",
          inline: false,
        },
        {
          name: "🛡️ 9. Security & Connection Center",
          value: "`/security audit`, `/connect github`, `/connect status`, `/home`, `/ask`",
          inline: false,
        },
      );

    const components = [createHelpSelect()];
    await interaction.reply({ embeds: [embed], components });
  },
};
