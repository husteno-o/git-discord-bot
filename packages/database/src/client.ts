import { config } from "@devpulse/config";
import { logger } from "@devpulse/logger";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

let clientInstance: ReturnType<typeof createClient> | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDbClient(customUrl?: string, customToken?: string) {
  if (clientInstance && !customUrl) {
    return clientInstance;
  }

  const url = customUrl || config.TURSO_DATABASE_URL || "file:devpulse.db";
  const authToken = customToken || config.TURSO_AUTH_TOKEN;

  logger.info({ url: url.replace(/:[^:@]+@/, ":***@") }, "Initializing database client");

  const client = createClient({
    url,
    authToken,
  });

  if (!customUrl) {
    clientInstance = client;
  }

  return client;
}

export function getDb(customUrl?: string, customToken?: string) {
  if (dbInstance && !customUrl) {
    return dbInstance;
  }

  const client = getDbClient(customUrl, customToken);
  const db = drizzle(client, { schema });

  if (!customUrl) {
    dbInstance = db;
  }

  return db;
}

export const db = getDb();
export type Database = typeof db;
