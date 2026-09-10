import { db, auditLogs, servers, serverMemberships, users } from "@devpulse/database";
import { getUserRole, requirePermission } from "@devpulse/permissions";
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { and, eq } from "drizzle-orm";
import { BrandColors } from "../ui/colors.js";
import { createBaseEmbed, createErrorEmbed } from "../ui/embeds.js";
import { NF } from "../ui/icons.js";
import type { Command } from "./types.js";

type AppRole = "admin" | "lead" | "developer" | "viewer";

export const roleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Manage team roles: assign, list, and remove developer permissions")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("assign")
        .setDescription("Assign a role to a team member")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("Discord user to assign role to").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("role")
            .setDescription("Role to assign")
            .addChoices(
              { name: "Admin (Full access)", value: "admin" },
              { name: "Lead (PR merge, review)", value: "lead" },
              { name: "Developer (Standard access)", value: "developer" },
              { name: "Viewer (Read-only)", value: "viewer" },
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all role assignments in this server"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a user's role assignment (reset to viewer)")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("Discord user to remove role from").setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: `${NF.cross} This command can only be used in a Discord server.`,
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    try {
      if (subcommand === "list") {
        await handleRoleList(interaction, guildId);
        return;
      }

      // Assign and Remove require admin role
      await requirePermission(guildId, interaction.user.id, "admin");

      if (subcommand === "assign") {
        await handleRoleAssign(interaction, guildId);
        return;
      }

      if (subcommand === "remove") {
        await handleRoleRemove(interaction, guildId);
        return;
      }
    } catch (err: unknown) {
      const errorEmbed = createErrorEmbed(err instanceof Error ? err : new Error(String(err)));
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};

const ROLE_HIERARCHY: Record<string, number> = { admin: 40, lead: 30, developer: 20, viewer: 10 };
const ROLE_ICONS: Record<string, string> = {
  admin: "👑",
  lead: "⭐",
  developer: "💻",
  viewer: "👁️",
};

async function handleRoleAssign(
  interaction: any,
  guildId: string,
): Promise<void> {
  const targetUser = interaction.options.getUser("user");
  const role = interaction.options.getString("role") as AppRole;

  if (!targetUser) {
    await interaction.reply({ content: `${NF.cross} User not found.`, ephemeral: true });
    return;
  }

  const assignerRole = await getUserRole(guildId, interaction.user.id);
  if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[assignerRole]) {
    await interaction.reply({
      content: `${NF.cross} You cannot assign a role equal to or higher than your own (\`${assignerRole}\`).`,
      ephemeral: true,
    });
    return;
  }

  if (targetUser.id === interaction.user.id && role === "admin") {
    await interaction.reply({
      content: `${NF.cross} You cannot assign yourself the admin role.`,
      ephemeral: true,
    });
    return;
  }

  const existing = await db.query.serverMemberships.findFirst({
    where: and(
      eq(serverMemberships.guildId, guildId),
      eq(serverMemberships.userId, targetUser.id),
    ),
  });

  const previousRole = existing?.role || "viewer";

  if (existing) {
    await db
      .update(serverMemberships)
      .set({ role: role as AppRole })
      .where(
        and(
          eq(serverMemberships.guildId, guildId),
          eq(serverMemberships.userId, targetUser.id),
        ),
      );
  } else {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, targetUser.id),
    });
    if (!dbUser) {
      await db.insert(users).values({
        id: targetUser.id,
        username: targetUser.username,
      });
    }

    await db.insert(serverMemberships).values({
      id: `${guildId}-${targetUser.id}-${Date.now()}`,
      guildId,
      userId: targetUser.id,
      role: role as AppRole,
    });
  }

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    guildId,
    userId: interaction.user.id,
    action: "role_assign",
    details: {
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      previousRole,
      newRole: role,
    },
  });

  await interaction.reply({
    embeds: [
      createBaseEmbed(`${NF.check} Role Assigned`)
        .setColor(BrandColors.success)
        .setDescription(
          `**${ROLE_ICONS[role]} ${targetUser.toString()}** now has the **${role}** role.\n\n` +
            `• Previous: \`${previousRole}\`\n` +
            `• New: \`${role}\`\n\n` +
            `_Assigned by ${interaction.user.toString()}_`,
        ),
    ],
  });
}

async function handleRoleRemove(
  interaction: any,
  guildId: string,
): Promise<void> {
  const targetUser = interaction.options.getUser("user");

  if (!targetUser) {
    await interaction.reply({ content: `${NF.cross} User not found.`, ephemeral: true });
    return;
  }

  const existing = await db.query.serverMemberships.findFirst({
    where: and(
      eq(serverMemberships.guildId, guildId),
      eq(serverMemberships.userId, targetUser.id),
    ),
  });

  if (!existing) {
    await interaction.reply({
      content: `${NF.warning} ${targetUser.toString()} doesn't have a role assignment in this server.`,
      ephemeral: true,
    });
    return;
  }

  const previousRole = existing.role;

  await db
    .delete(serverMemberships)
    .where(
      and(
        eq(serverMemberships.guildId, guildId),
        eq(serverMemberships.userId, targetUser.id),
      ),
    );

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    guildId,
    userId: interaction.user.id,
    action: "role_remove",
    details: {
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
      previousRole,
    },
  });

  await interaction.reply({
    embeds: [
      createBaseEmbed(`${NF.check} Role Removed`)
        .setColor(BrandColors.warning)
        .setDescription(
          `**${targetUser.toString()}**'s role has been removed (reset to viewer).\n\n` +
            `• Previous: \`${previousRole}\`\n` +
            `• New: \`viewer\` (default)\n\n` +
            `_Removed by ${interaction.user.toString()}_`,
        ),
    ],
  });
}

async function handleRoleList(
  interaction: any,
  guildId: string,
): Promise<void> {
  const memberships = await db.query.serverMemberships.findMany({
    where: eq(serverMemberships.guildId, guildId),
  });

  const grouped: Record<string, string[]> = { admin: [], lead: [], developer: [], viewer: [] };
  for (const m of memberships) {
    const role = m.role as keyof typeof grouped;
    if (grouped[role]) {
      grouped[role].push(`<@${m.userId}>`);
    }
  }

  const server = await db.query.servers.findFirst({
    where: eq(servers.id, guildId),
  });

  if (server?.ownerId) {
    grouped.admin = [`<@${server.ownerId}> (Owner)`];
  }

  const lines: string[] = [];
  for (const [role, members] of Object.entries(grouped)) {
    if (members.length > 0) {
      lines.push(
        `**${ROLE_ICONS[role]} ${role.charAt(0).toUpperCase() + role.slice(1)}:** ${members.join(", ")}`,
      );
    }
  }

  const embed = createBaseEmbed(`${NF.users} Team Roles`)
    .setColor(BrandColors.primary)
    .setDescription(
      lines.length > 0
        ? lines.join("\n\n")
        : "No role assignments configured. Use `/role assign` to get started.",
    )
    .setFooter({
      text: "Roles control access to write operations (PR merge, review, settings). Everyone starts as viewer.",
    });

  await interaction.reply({ embeds: [embed] });
}