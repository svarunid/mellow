import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { team, user } from "./auth";

export const workspace = pgTable("workspace", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	teamId: text("team_id").references(() => team.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const workspaceRelations = relations(workspace, ({ one }) => ({
	user: one(user, {
		fields: [workspace.userId],
		references: [user.id],
	}),
	team: one(team, {
		fields: [workspace.teamId],
		references: [team.id],
	}),
}));
