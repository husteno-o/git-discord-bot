import { initDatabase } from "@devpulse/database";
import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("Fastify API Server Endpoints", () => {
  it("responds to /health with system info", async () => {
    await initDatabase();
    const server = buildServer();

    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("healthy");
    expect(body.service).toBe("DevPulse API");
    expect(body.memory).toBeDefined();
  });

  it("responds to /ready with dependency statuses", async () => {
    const server = buildServer();

    const response = await server.inject({
      method: "GET",
      url: "/ready",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ready");
    expect(body.database).toBe("connected");
  });

  it("responds to /metrics with stats", async () => {
    const server = buildServer();

    const response = await server.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(typeof body.serversCount).toBe("number");
    expect(typeof body.repositoriesTracked).toBe("number");
  });
});
