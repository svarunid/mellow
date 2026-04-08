import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const project = pgTable(
	"project",
	{
		id: text("id").primaryKey(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspace.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		prefix: text("prefix").notNull(),
		description: text("description"),
		featuresEnabled: jsonb("features_enabled").default({}).$type<Record<string, boolean>>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("project_workspace_prefix_uniq").on(table.workspaceId, table.prefix),
		index("project_workspaceId_idx").on(table.workspaceId),
	],
);

export const projectMember = pgTable(
	"project_member",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspace.id, { onDelete: "cascade" }),
		role: text("role").default("member").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		unique("projectMember_project_workspace_uniq").on(table.projectId, table.workspaceId),
		index("projectMember_projectId_idx").on(table.projectId),
		index("projectMember_workspaceId_idx").on(table.workspaceId),
	],
);

export const projectRelations = relations(project, ({ one, many }) => ({
	workspace: one(workspace, {
		fields: [project.workspaceId],
		references: [workspace.id],
	}),
	members: many(projectMember),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
	project: one(project, {
		fields: [projectMember.projectId],
		references: [project.id],
	}),
	workspace: one(workspace, {
		fields: [projectMember.workspaceId],
		references: [workspace.id],
	}),
}));
