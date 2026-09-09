import { config } from "@devpulse/config";
import { initDatabase } from "@devpulse/database";
import { logger } from "@devpulse/logger";
import { buildServer } from "./server.js";

async function main() {
  await initDatabase();
  const server = buildServer();

  try {
    const address = await server.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info({ address }, `DevPulse API server listening on ${address}`);
  } catch (err: unknown) {
    logger.error({ err }, "Failed to start DevPulse API server");
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export * from "./server.js";
