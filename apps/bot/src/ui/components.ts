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
      .setLabel("Overview")
      .setStyle(activeTab === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:prs:${owner}:${repo}`)
      .setLabel("PRs")
      .setStyle(activeTab === "prs" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:issues:${owner}:${repo}`)
      .setLabel("Issues")
      .setStyle(activeTab === "issues" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:commits:${owner}:${repo}`)
      .setLabel("Commits")
      .setStyle(activeTab === "commits" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`repo:releases:${owner}:${repo}`)
      .setLabel("Releases")
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
    new ButtonBuilder().setLabel("Open GitHub ↗").setStyle(ButtonStyle.Link).setURL(prUrl),
  );
  return [row];
}

export function createHomeNavButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("home:nav:repos")
      .setLabel("Repositories")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("home:nav:prs")
      .setLabel("Pull Requests")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("home:nav:issues")
      .setLabel("Issues")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("home:nav:activity")
      .setLabel("Activity")
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
      .setLabel("Security Guide ↗")
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
        .setLabel(`${NF.github} 1. Repository Intelligence (/repo)`)
        .setDescription("Health score, growth, dependencies, metrics")
        .setValue("repo"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.gitPullRequest} 2. Pull Request Tools (/pr)`)
        .setDescription("Stale detection, CI checks, diffs, 1-click merge")
        .setValue("pr"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.search} 3. GitHub Search Engine (/search)`)
        .setDescription("Code, issues, PRs, repos, commits qualifiers")
        .setValue("search"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.terminal} 4. Code Intelligence (/code & /why)`)
        .setDescription("File inspection, blame, PR link tracing")
        .setValue("code"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.speedometer} 5. Investigation (/investigate)`)
        .setDescription("Lifecycle timeline: Issue -> Commit -> PR -> Release")
        .setValue("investigate"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.robot} 6. Actions Control Center (/actions)`)
        .setDescription("Visual tree, run inspection, rerun & cancel")
        .setValue("actions"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.shield} 7. Security Center (/security)`)
        .setDescription("Dependabot alerts, advisories, CVE breakdown")
        .setValue("security"),
      new StringSelectMenuOptionBuilder()
        .setLabel(`${NF.warning} 8. Watchtower Alerts (/watch)`)
        .setDescription("Automated Discord alerts for releases, PRs, issues")
        .setValue("watch"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
