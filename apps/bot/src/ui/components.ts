import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { NF } from "./icons.js";

export function createRepoNavButtons(
  owner: string,
  repo: string,
  activeTab = "overview",
): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`repo:overview:${owner}:${repo}`)
      .setLabel(`${NF.github} Overview`)
      .setStyle(activeTab === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:prs:${owner}:${repo}`)
      .setLabel(`${NF.gitPullRequest} PRs`)
      .setStyle(activeTab === "prs" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:issues:${owner}:${repo}`)
      .setLabel(" Issues")
      .setStyle(activeTab === "issues" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:commits:${owner}:${repo}`)
      .setLabel(`${NF.gitCommit} Commits`)
      .setStyle(activeTab === "commits" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:releases:${owner}:${repo}`)
      .setLabel(`${NF.gitTag} Releases`)
      .setStyle(activeTab === "releases" ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );

  return [row1];
}

export function createPrActionButtons(
  owner: string,
  repo: string,
  prNumber: number,
  prUrl: string,
): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pr:approve:${owner}:${repo}:${prNumber}`)
      .setLabel(`${NF.check} Approve`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`pr:request_changes:${owner}:${repo}:${prNumber}`)
      .setLabel(`${NF.warning} Request Changes`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`pr:merge:${owner}:${repo}:${prNumber}`)
      .setLabel(`${NF.gitMerge} Merge`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel(`${NF.arrowRight} Open GitHub`)
      .setStyle(ButtonStyle.Link)
      .setURL(prUrl),
  );
  return [row];
}

export function createHomeNavButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("home:nav:repos")
      .setLabel(`${NF.package} Repositories`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("home:nav:prs")
      .setLabel(`${NF.gitPullRequest} Pull Requests`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("home:nav:issues")
      .setLabel(" Issues")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("home:nav:activity")
      .setLabel(`${NF.speedometer} Activity`)
      .setStyle(ButtonStyle.Secondary),
  );
  return [row];
}

export function createDeleteSecretButton(messageId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`secret:delete:${messageId}`)
      .setLabel(`${NF.cross} Delete Leaked Message`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setLabel(`${NF.shield} Security Guide`)
      .setStyle(ButtonStyle.Link)
      .setURL(
        "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation",
      ),
  );
}

export function createHelpSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help:category_select")
    .setPlaceholder("Select a GitHub developer suite...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.github} Repository Intelligence (/repo)`)
        .setDescription("Health score, growth, dependencies, metrics")
        .setValue("repo"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.gitPullRequest} Pull Request Tools (/pr)`)
        .setDescription("Stale detection, CI checks, diffs, 1-click merge")
        .setValue("pr"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.search} GitHub Search Engine (/search)`)
        .setDescription("Code, issues, PRs, repos, commits qualifiers")
        .setValue("search"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.terminal} Code Intelligence (/code & /why)`)
        .setDescription("File inspection, blame, PR link tracing")
        .setValue("code"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.speedometer} Investigation (/investigate)`)
        .setDescription("Lifecycle timeline: Issue -> Commit -> PR -> Release")
        .setValue("investigate"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.robot} Actions Control Center (/actions)`)
        .setDescription("Visual tree, run inspection, rerun & cancel")
        .setValue("actions"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.shield} Security Center (/security)`)
        .setDescription("Dependabot alerts, advisories, CVE breakdown")
        .setValue("security"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.warning} Watchtower Alerts (/watch)`)
        .setDescription("Automated Discord alerts for releases, PRs, issues")
        .setValue("watch"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
