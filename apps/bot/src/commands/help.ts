import { SlashCommandBuilder } from "discord.js";
import { BrandColors } from "../ui/colors.js";
import { createHelpSelect } from "../ui/components.js";
import { createBaseEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import {
  ANSI,
  renderTuiCard,
  tuiBottomBar,
  tuiDivider,
  tuiLine,
  tuiPrompt,
  tuiTopBar,
} from "../ui/tui.js";
import type { Command } from "./types.js";

export function getModuleHelpEmbed(moduleName: string) {
  const map: Record<string, { title: string; synopsis: string; commands: [string, string][] }> = {
    repo: {
      title: "REPO INTELLIGENCE",
      synopsis: "Deep repository metrics, health scores, and dependencies",
      commands: [
        ["/repo <repo>", "Master telemetry dashboard"],
        ["/repo <repo> view:health", "Health breakdown & audit"],
        ["/repo <repo> view:dependencies", "Package manifest & CVEs"],
        ["/repo <repo> view:growth", "30-day velocity & stars"],
      ],
    },
    pr: {
      title: "PULL REQUEST TOOLS",
      synopsis: "Inspect, review, merge & unblock PRs in chat",
      commands: [
        ["/pr view <repo> <num>", "Diffs, checks, cycle time"],
        ["/pr list <repo> [state]", "List open or closed PRs"],
        ["/pr review <repo> <num>", "Approve, request changes"],
        ["/pr merge <repo> <num>", "1-click instant merge"],
        ["/pr stale <repo>", "Detect stale PRs (> 14d)"],
        ["/pr waiting <repo>", "Waiting on reviewers (> 24h)"],
      ],
    },
    search: {
      title: "GITHUB POWER SEARCH",
      synopsis: "Full GitHub qualifier search from Discord",
      commands: [
        ["/search code <q> [repo]", "Search codebase files"],
        ["/search issues <q>", "Search issues with filters"],
        ["/search prs <q>", "Search pull requests"],
        ["/search repos <q>", "Search repos by stars/lang"],
        ["/search commits <q>", "Search commit history"],
      ],
    },
    code: {
      title: "CODE INTELLIGENCE",
      synopsis: "File inspection, git blame & historical tracing",
      commands: [
        ["/code view <repo> <path>", "File contents & commit"],
        ["/code blame <repo> <path>", "Blame author & PR link"],
        ["/why <repo> <path> [line]", "Trace File -> Commit -> PR"],
      ],
    },
    investigate: {
      title: "INVESTIGATION ENGINE",
      synopsis: "Connect chronological lifecycle timelines",
      commands: [
        ["/investigate issue <repo>", "Issue -> Commit -> Release"],
        ["/investigate pr <repo>", "Trace review -> merge lifecycle"],
      ],
    },
    actions: {
      title: "ACTIONS CI/CD CENTER",
      synopsis: "Workflow run status trees, reruns & cancels",
      commands: [
        ["/actions status <repo>", "Visual tree of CI checks"],
        ["/actions runs <repo>", "List recent workflow runs"],
        ["/actions rerun <repo> <id>", "Trigger failed workflow rerun"],
        ["/actions cancel <repo>", "Cancel active workflow run"],
      ],
    },
    security: {
      title: "SECURITY AUDITOR",
      synopsis: "Dependabot alerts & vulnerable packages",
      commands: [["/security audit <repo>", "Scan for Critical/High CVEs"]],
    },
    watch: {
      title: "WATCHTOWER ALERTS",
      synopsis: "Automated channel alerts for releases & PRs",
      commands: [
        ["/watch release <repo>", "Post new GitHub releases"],
        ["/watch pr <repo>", "Post newly opened PRs"],
        ["/watch security <repo>", "Post new security advisories"],
        ["/watch list", "List active subscriptions"],
        ["/watch remove <id>", "Unsubscribe alert channel"],
      ],
    },
  };

  const info = map[moduleName] || map.repo;
  const tuiLines: string[] = [
    tuiTopBar(`MAN: ${info.title}`),
    tuiPrompt(`gitbot man ${moduleName}`),
    tuiDivider("SYNOPSIS"),
    tuiLine(`${ANSI.white}${info.synopsis}${ANSI.reset}`),
    tuiDivider("COMMAND SUITE"),
  ];

  for (const [cmd, desc] of info.commands) {
    tuiLines.push(tuiLine(`${ANSI.cyan}▸${ANSI.reset} ${ANSI.white}${cmd}${ANSI.reset}`));
    tuiLines.push(tuiLine(`  ${ANSI.dim}${desc}${ANSI.reset}`));
  }

  tuiLines.push(tuiBottomBar());
  const tui = renderTuiCard(tuiLines);

  const desc = `> *${info.synopsis}*\n\n${tui}`;

  return createBaseEmbed(`${NF.terminal} Manual: ${info.title}`, desc).setColor(
    BrandColors.primary,
  );
}

export function createHelpDashboardEmbed() {
  const tui = renderTuiCard([
    tuiTopBar("GITBOT TERMINAL v2.4"),
    tuiPrompt("gitbot --help"),
    tuiDivider("ACTIVE SUBSYSTEMS"),
    tuiLine(
      `${ANSI.dim}01${ANSI.reset} ${ANSI.magenta}repo    ${ANSI.reset} ${ANSI.white}/repo <target> [view]${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}02${ANSI.reset} ${ANSI.cyan}pr      ${ANSI.reset} ${ANSI.white}/pr <view|list|review>${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}03${ANSI.reset} ${ANSI.blue}search  ${ANSI.reset} ${ANSI.white}/search <code|issues|prs>${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}04${ANSI.reset} ${ANSI.green}code    ${ANSI.reset} ${ANSI.white}/code view, /code blame${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}05${ANSI.reset} ${ANSI.yellow}trace   ${ANSI.reset} ${ANSI.white}/why, /investigate${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}06${ANSI.reset} ${ANSI.magenta}stats   ${ANSI.reset} ${ANSI.white}/activity, /team${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}07${ANSI.reset} ${ANSI.cyan}radar   ${ANSI.reset} ${ANSI.white}/trending, /watch${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}08${ANSI.reset} ${ANSI.blue}actions ${ANSI.reset} ${ANSI.white}/actions status, /release${ANSI.reset}`,
    ),
    tuiLine(
      `${ANSI.dim}09${ANSI.reset} ${ANSI.green}secure  ${ANSI.reset} ${ANSI.white}/security audit, /connect${ANSI.reset}`,
    ),
    tuiDivider("COMMAND CENTER"),
    tuiLine(`${ANSI.dim}Select a module below or type a command${ANSI.reset}`),
    tuiBottomBar(),
  ]);

  const desc = `> *The ultimate Discord command center engineered so developers never have to leave chat for GitHub workflows.*\n\n⚡ **Instant Telemetry**  •  🌿 **PR Power Tools**  •  🛡️ **Zero-Config Security**\n\n${tui}`;

  return createBaseEmbed(`${NF.github} GITBOT — Developer Operating System`, desc).setColor(
    BrandColors.primary,
  );
}

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Explore GITBOT GitHub Power-User feature sets and command suites"),

  async execute(interaction) {
    const embed = createHelpDashboardEmbed();
    const components = [createHelpSelect()];
    await interaction.reply({ embeds: [embed], components });
  },
};
