import { describe, expect, it } from "vitest";
import { commandMap, commands } from "./commands/index.js";
import { createBotClient } from "./index.js";

describe("Discord Bot Application", () => {
  it("registers all 16 command groups", () => {
    expect(commands.length).toBe(16);
    expect(commandMap.has("github")).toBe(true);
    expect(commandMap.has("dev")).toBe(true);
    expect(commandMap.has("tools")).toBe(true);
    expect(commandMap.has("deps")).toBe(true);
    expect(commandMap.has("security")).toBe(true);
    expect(commandMap.has("monitor")).toBe(true);
    expect(commandMap.has("trending")).toBe(true);
    expect(commandMap.has("news")).toBe(true);
    expect(commandMap.has("team")).toBe(true);
    expect(commandMap.has("analytics")).toBe(true);
    expect(commandMap.has("remind")).toBe(true);
    expect(commandMap.has("project")).toBe(true);
    expect(commandMap.has("settings")).toBe(true);
    expect(commandMap.has("help")).toBe(true);
    expect(commandMap.has("setup")).toBe(true);
    expect(commandMap.has("ai")).toBe(true);
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
