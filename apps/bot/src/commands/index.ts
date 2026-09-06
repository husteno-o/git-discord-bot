import { aiCommand } from "./ai.js";
import { analyticsCommand } from "./analytics.js";
import { depsCommand } from "./deps.js";
import { devCommand } from "./dev.js";
import { githubCommand } from "./github.js";
import { helpCommand } from "./help.js";
import { monitorCommand } from "./monitor.js";
import { newsCommand } from "./news.js";
import { projectCommand } from "./project.js";
import { remindCommand } from "./remind.js";
import { securityCommand } from "./security.js";
import { settingsCommand } from "./settings.js";
import { setupCommand } from "./setup.js";
import { teamCommand } from "./team.js";
import { toolsCommand } from "./tools.js";
import { trendingCommand } from "./trending.js";
import type { Command } from "./types.js";

export const commands: Command[] = [
  githubCommand,
  devCommand,
  toolsCommand,
  depsCommand,
  securityCommand,
  monitorCommand,
  trendingCommand,
  newsCommand,
  teamCommand,
  analyticsCommand,
  remindCommand,
  projectCommand,
  settingsCommand,
  helpCommand,
  setupCommand,
  aiCommand,
];

export const commandMap = new Map<string, Command>(commands.map((cmd) => [cmd.data.name, cmd]));

export * from "./types.js";
