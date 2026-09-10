import { UnauthorizedError } from "@devpulse/core";
import { cache } from "@devpulse/cache";
import { db, serverMemberships, servers } from "@devpulse/database";
import { and, eq } from "drizzle-orm";

export type Role = "admin" | "lead" | "developer" | "viewer";

export const RoleHierarchy: Record<Role, number> = {
  admin: 40,
  lead: 30,
  developer: 20,
  viewer: 10,
};

const ROLE_CACHE_TTL = 300; // 5 minutes

export async function getUserRole(guildId: string, userId: string): Promise<Role> {
  const cacheKey = `perm:${guildId}:${userId}`;
  const cached = await cache.get<Role>(cacheKey);
  if (cached) return cached;

  const server = await db.query.servers.findFirst({
    where: eq(servers.id, guildId),
  });

  if (server && server.ownerId === userId) {
    await cache.set(cacheKey, "admin", ROLE_CACHE_TTL);
    return "admin";
  }

  const membership = await db.query.serverMemberships.findFirst({
    where: and(eq(serverMemberships.guildId, guildId), eq(serverMemberships.userId, userId)),
  });

  const role = (membership?.role as Role) || "viewer";
  await cache.set(cacheKey, role, ROLE_CACHE_TTL);
  return role;
}

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[requiredRole];
}

export async function requirePermission(
  guildId: string,
  userId: string,
  requiredRole: Role,
): Promise<void> {
  const role = await getUserRole(guildId, userId);
  if (!hasPermission(role, requiredRole)) {
    throw new UnauthorizedError(
      `Permission denied: this action requires '${requiredRole}' role, but your role is '${role}'.`,
    );
  }
}

export function assertTenantOwnership(
  entityGuildId: string,
  requestGuildId: string,
  entityName = "Resource",
): void {
  if (entityGuildId !== requestGuildId) {
    throw new UnauthorizedError(
      `Access denied: ${entityName} does not belong to this Discord server.`,
    );
  }
}
