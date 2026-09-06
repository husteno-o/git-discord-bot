import { describe, expect, it } from "vitest";
import { commandMap, commands } from "./commands/index.js";
import { createBotClient } from "./index.js";

describe("Discord Bot Application", () => {
  it("registers all GitHub Power-User command groups", () => {
    expect(commands.length).toBe(20);
    expect(commandMap.has("repo")).toBe(true);
    expect(commandMap.has("pr")).toBe(true);
    expect(commandMap.has("ai")).toBe(true);
    expect(commandMap.has("search")).toBe(true);
    expect(commandMap.has("code")).toBe(true);
    expect(commandMap.has("investigate")).toBe(true);
    expect(commandMap.has("activity")).toBe(true);
    expect(commandMap.has("trending")).toBe(true);
    expect(commandMap.has("watch")).toBe(true);
    expect(commandMap.has("actions")).toBe(true);
    expect(commandMap.has("security")).toBe(true);
    expect(commandMap.has("release")).toBe(true);
    expect(commandMap.has("team")).toBe(true);
    expect(commandMap.has("home")).toBe(true);
    expect(commandMap.has("connect")).toBe(true);
    expect(commandMap.has("why")).toBe(true);
    expect(commandMap.has("ask")).toBe(true);
    expect(commandMap.has("tools")).toBe(true);
    expect(commandMap.has("settings")).toBe(true);
    expect(commandMap.has("help")).toBe(true);
  });

  it("ensures every command has valid metadata and execute function", () => {
    for (const cmd of commands) {
      expect(cmd.data.name).toBeDefined();
      expect(cmd.data.description).toBeDefined();
      expect(typeof cmd.execute).toBe("function");
    }
  });

  it("instantiates Discord client with required event handlers", () => {
    const client = createBotClient();
    expect(client).toBeDefined();
    expect(client.listenerCount("interactionCreate")).toBeGreaterThan(0);
    expect(client.listenerCount("messageCreate")).toBeGreaterThan(0);
  });
});
