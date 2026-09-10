import { actionsCommand } from "./actions.js";
import { activityCommand } from "./activity.js";
import { aiCommand } from "./ai.js";
import { askCommand } from "./ask.js";
import { codeReviewCommand } from "./code-review.js";
import { codeCommand } from "./code.js";
import { connectCommand } from "./connect.js";
import { helpCommand } from "./help.js";
import { homeCommand } from "./home.js";
import { investigateCommand } from "./investigate.js";
import { issueCommand } from "./issue.js";
import { prCommand } from "./pr.js";
import { releaseCommand } from "./release.js";
import { repoCommand } from "./repo.js";
import { roleCommand } from "./role.js";
import { searchCommand } from "./search.js";
import { securityCommand } from "./security.js";
import { settingsCommand } from "./settings.js";
import { standupCommand } from "./standup.js";
import { teamCommand } from "./team.js";
import { toolsCommand } from "./tools.js";
import { trendingCommand } from "./trending.js";
import type { Command } from "./types.js";
import { watchCommand } from "./watch.js";
import { whyCommand } from "./why.js";

export const commands: Command[] = [
  repoCommand,
  prCommand,
  aiCommand,
  codeReviewCommand,
  searchCommand,
  codeCommand,
  investigateCommand,
  activityCommand,
  trendingCommand,
  watchCommand,
  actionsCommand,
  securityCommand,
  releaseCommand,
  teamCommand,
  homeCommand,
  connectCommand,
  whyCommand,
  askCommand,
  toolsCommand,
  settingsCommand,
  roleCommand,
  issueCommand,
  standupCommand,
  helpCommand,
];

export const commandMap = new Map<string, Command>(commands.map((cmd) => [cmd.data.name, cmd]));

export * from "./types.js";
