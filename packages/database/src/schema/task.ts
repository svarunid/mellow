import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { project } from "./project";

export const integration = pgTable(
	"integration",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		source: text("source").notNull(),
		webhookSecret: text("webhook_secret"),
		externalProjectId: text("external_project_id"),
		config: jsonb("config").$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("integration_project_source_uniq").on(table.projectId, table.source),
		index("integration_projectId_idx").on(table.projectId),
	],
);

export const task = pgTable(
	"task",
	{
		id: text("id").primaryKey(),
		projectId: text("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		integrationId: text("integration_id").references(() => integration.id, { onDelete: "cascade" }),
		source: text("source").notNull(),
		externalId: text("external_id").notNull(),
		externalKey: text("external_key"),
		externalUrl: text("external_url"),
		externalApiUrl: text("external_api_url"),
		title: text("title").notNull(),
		description: text("description"),
		status: text("status"),
		statusRaw: text("status_raw"),
		priority: integer("priority"),
		priorityRaw: text("priority_raw"),
		assignees: jsonb("assignees")
			.$type<Array<{ externalId: string; name: string; email?: string }>>()
			.default([]),
		labels: jsonb("labels")
			.$type<Array<{ id: string; name: string; color?: string }>>()
			.default([]),
		dueDate: timestamp("due_date"),
		rawPayload: jsonb("raw_payload"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("task_integration_external_uniq").on(table.integrationId, table.externalId),
		index("task_projectId_idx").on(table.projectId),
		index("task_integrationId_idx").on(table.integrationId),
		index("task_source_externalId_idx").on(table.source, table.externalId),
	],
);

export const integrationRelations = relations(integration, ({ one, many }) => ({
	project: one(project, {
		fields: [integration.projectId],
		references: [project.id],
	}),
	tasks: many(task),
}));

export const taskRelations = relations(task, ({ one }) => ({
	project: one(project, {
		fields: [task.projectId],
		references: [project.id],
	}),
	integration: one(integration, {
		fields: [task.integrationId],
		references: [integration.id],
	}),
}));
