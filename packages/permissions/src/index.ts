import { UnauthorizedError } from "@devpulse/core";
import { db, serverMemberships, servers } from "@devpulse/database";
import { and, eq } from "drizzle-orm";

export type Role = "admin" | "lead" | "developer" | "viewer";

export const RoleHierarchy: Record<Role, number> = {
  admin: 40,
  lead: 30,
  developer: 20,
  viewer: 10,
};

export async function getUserRole(guildId: string, userId: string): Promise<Role> {
  // Check if user is server owner
  const server = await db.query.servers.findFirst({
    where: eq(servers.id, guildId),
  });

  if (server && server.ownerId === userId) {
    return "admin";
  }

  const membership = await db.query.serverMemberships.findFirst({
    where: and(eq(serverMemberships.guildId, guildId), eq(serverMemberships.userId, userId)),
  });

  return (membership?.role as Role) || "developer";
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
