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
      .setCustomId(`repo:commits:${owner}:${repo}`)
      .setLabel("Commits")
      .setStyle(activeTab === "commits" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🔨"),
    new ButtonBuilder()
      .setCustomId(`repo:prs:${owner}:${repo}`)
      .setLabel("Pull Requests")
      .setStyle(activeTab === "prs" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🔀"),
    new ButtonBuilder()
      .setCustomId(`repo:issues:${owner}:${repo}`)
      .setLabel("Issues")
      .setStyle(activeTab === "issues" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🐛"),
    new ButtonBuilder()
      .setCustomId(`repo:releases:${owner}:${repo}`)
      .setLabel("Releases")
      .setStyle(activeTab === "releases" ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setEmoji("🚀"),
  );

  return [row1];
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
    .setPlaceholder("Select a command module...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("GitHub Intelligence")
        .setDescription("Repository dashboards, commits, PRs, cycle time")
        .setValue("github")
        .setEmoji("📦"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Developer Productivity")
        .setDescription("Personal developer dashboards, workload, focus")
        .setValue("dev")
        .setEmoji("👨‍💻"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Developer Toolbox")
        .setDescription("30+ deterministic tools (JSON, JWT, Hash, Regex, Cron)")
        .setValue("tools")
        .setEmoji("🛠️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Security Center")
        .setDescription("CVE lookup, package vulnerabilities, secret detection")
        .setValue("security")
        .setEmoji("🛡️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Website & Uptime Monitoring")
        .setDescription("Synthetic HTTP, latency, SSL expiration checks")
        .setValue("monitor")
        .setEmoji("📡"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Trending & News")
        .setDescription("Trending repositories, languages, tech headlines")
        .setValue("trending")
        .setEmoji("🔥"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Team & Workflows")
        .setDescription("Standups, reminders, project context memory")
        .setValue("team")
        .setEmoji("👥"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Server Settings")
        .setDescription("Channels, timezone, secret scanning, AI toggle")
        .setValue("settings")
        .setEmoji("⚙️"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function createNewsCategorySelect(): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("news:category_select")
    .setPlaceholder("Filter by category...")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Developer & Architecture")
        .setValue("developer")
        .setEmoji("💻"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Security & Vulnerabilities")
        .setValue("security")
        .setEmoji("🛡️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("GitHub & Open Source")
        .setValue("github")
        .setEmoji("🐙"),
      new StringSelectMenuOptionBuilder()
        .setLabel("AI & Machine Learning")
        .setValue("ai")
        .setEmoji("🤖"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Cloud & DevOps")
        .setValue("cloud")
        .setEmoji("☁️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Databases & Storage")
        .setValue("databases")
        .setEmoji("🗄️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Web Development & Frontend")
        .setValue("web")
        .setEmoji("🌐"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Rust & Systems")
        .setValue("rust")
        .setEmoji("🦀"),
      new StringSelectMenuOptionBuilder().setLabel("Go & Backend").setValue("go").setEmoji("🐹"),
      new StringSelectMenuOptionBuilder()
        .setLabel("TypeScript & JavaScript")
        .setValue("typescript")
        .setEmoji("📜"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
