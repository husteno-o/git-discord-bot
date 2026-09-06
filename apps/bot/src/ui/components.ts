import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

export function createRepoNavButtons(
  owner: string,
  repo: string,
  activeTab = "overview",
): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`repo:overview:${owner}:${repo}`)
      .setLabel("Overview")
      .setStyle(activeTab === "overview" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("📌"),
    new ButtonBuilder()
      .setCustomId(`repo:prs:${owner}:${repo}`)
      .setLabel("PRs")
      .setStyle(activeTab === "prs" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🔀"),
    new ButtonBuilder()
      .setCustomId(`repo:issues:${owner}:${repo}`)
      .setLabel("Issues")
      .setStyle(activeTab === "issues" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🐛"),
    new ButtonBuilder()
      .setCustomId(`repo:commits:${owner}:${repo}`)
      .setLabel("Commits")
      .setStyle(activeTab === "commits" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🔨"),
    new ButtonBuilder()
      .setCustomId(`repo:releases:${owner}:${repo}`)
      .setLabel("Releases")
      .setStyle(activeTab === "releases" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🚀"),
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
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId(`pr:request_changes:${owner}:${repo}:${prNumber}`)
      .setLabel("Request Changes")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("⚠️"),
    new ButtonBuilder()
      .setCustomId(`pr:merge:${owner}:${repo}:${prNumber}`)
      .setLabel("Merge")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🔀"),
    new ButtonBuilder()
      .setLabel("Open GitHub")
      .setStyle(ButtonStyle.Link)
      .setURL(prUrl)
      .setEmoji("↗️"),
  );
  return [row];
}

export function createHomeNavButtons(): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("home:nav:repos")
      .setLabel("Repositories")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📁"),
    new ButtonBuilder()
      .setCustomId("home:nav:prs")
      .setLabel("Pull Requests")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔀"),
    new ButtonBuilder()
      .setCustomId("home:nav:issues")
      .setLabel("Issues")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🐛"),
    new ButtonBuilder()
      .setCustomId("home:nav:activity")
      .setLabel("Activity")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📈"),
  );
  return [row];
}

export function createDeleteSecretButton(messageId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`secret:delete:${messageId}`)
      .setLabel("Delete Leaked Message")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️"),
    new ButtonBuilder()
      .setLabel("Security Guide")
      .setStyle(ButtonStyle.Link)
      .setURL(
        "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation",
      )
      .setEmoji("🛡️"),
  );
}

export function createHelpSelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("help:category_select")
    .setPlaceholder("Explore GitHub Power-User Feature Areas...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Repository Intelligence (/repo)")
        .setDescription("Health score, growth, dependencies, metrics")
        .setValue("repo")
        .setEmoji("📊"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Pull Request Tools (/pr)")
        .setDescription("Stale detection, CI checks, diffs, 1-click merge")
        .setValue("pr")
        .setEmoji("🔀"),
      new StringSelectMenuOptionBuilder()
        .setLabel("GitHub Search Engine (/search)")
        .setDescription("Code, issues, PRs, repos, commits qualifiers")
        .setValue("search")
        .setEmoji("🔎"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Code Intelligence (/code & /why)")
        .setDescription("File inspection, blame, PR link tracing")
        .setValue("code")
        .setEmoji("🧠"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Investigation (/investigate)")
        .setDescription("Chronological lifecycle timeline: Issue -> Commit -> PR -> Release")
        .setValue("investigate")
        .setEmoji("🕵️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Actions Control Center (/actions)")
        .setDescription("Visual tree, run inspection, rerun & cancel")
        .setValue("actions")
        .setEmoji("⚙️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Security (/security)")
        .setDescription("Dependabot alerts, advisories, CVE breakdown")
        .setValue("security")
        .setEmoji("🛡️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Watchtower (/watch)")
        .setDescription("Automated Discord alerts for releases, PRs, issues")
        .setValue("watch")
        .setEmoji("🚨"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
