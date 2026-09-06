import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db, initDatabase, projects, servers, users } from "./index.js";

describe("Database layer with libSQL and Drizzle", () => {
  it("initializes tables and inserts multi-tenant records", async () => {
    await initDatabase();

    const timestamp = Date.now();
    // 1. Create Server A
    const serverAId = `guild-${timestamp}`;
    await db.insert(servers).values({
      id: serverAId,
      name: "Acme Engineering",
      ownerId: `user-${timestamp}`,
      timezone: "America/New_York",
    });

    const serverA = await db.query.servers.findFirst({
      where: eq(servers.id, serverAId),
    });
    expect(serverA).toBeDefined();
    expect(serverA?.name).toBe("Acme Engineering");

    // 2. Create User
    const userId = `user-${timestamp}`;
    await db.insert(users).values({
      id: userId,
      username: "swadhin",
      githubUsername: "octocat",
    });

    const foundUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    expect(foundUser?.githubUsername).toBe("octocat");

    // 3. Create Project under Server A
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId,
      guildId: serverAId,
      name: `DevPulse Core ${timestamp}`,
      description: "Developer operating system for Discord",
      stack: ["Bun", "TypeScript", "Fastify", "Turso"],
      createdBy: userId,
    });

    const foundProject = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    expect(foundProject?.name).toBe(`DevPulse Core ${timestamp}`);
    expect(foundProject?.stack).toEqual(["Bun", "TypeScript", "Fastify", "Turso"]);

    // 4. Ensure isolation: query project with wrong server ID returns nothing
    const wrongServerProjects = await db.query.projects.findMany({
      where: eq(projects.guildId, "guild-9999"),
    });
    expect(wrongServerProjects.length).toBe(0);
  });
});
