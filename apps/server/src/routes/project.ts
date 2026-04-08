import { db } from "@mellow/database/client";
import { project, projectMember, workspace } from "@mellow/database/schema";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { requireAuth } from "../session";

export const projectRoutes = new Elysia({ prefix: "/api/projects" })
	.use(requireAuth)
	.post(
		"/",
		async ({ user, body, set }) => {
			const [ws] = await db.select().from(workspace).where(eq(workspace.userId, user!.id)).limit(1);

			if (!ws) {
				set.status = 404;
				return { error: "Workspace not found" };
			}

			const existingProjects = await db
				.select()
				.from(project)
				.where(eq(project.workspaceId, ws.id));

			const prefixUpper = body.prefix.toUpperCase();
			const existing = existingProjects.find((p) => p.prefix === prefixUpper);
			if (existing) {
				set.status = 409;
				return { error: "A project with this prefix already exists in your workspace" };
			}

			const [created] = await db
				.insert(project)
				.values({
					id: crypto.randomUUID(),
					workspaceId: ws.id,
					name: body.name,
					prefix: prefixUpper,
					description: body.description ?? null,
				})
				.returning();

			set.status = 201;
			return created;
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 100 }),
				prefix: t.String({ minLength: 2, maxLength: 6 }),
				description: t.Optional(t.String({ maxLength: 500 })),
			}),
		},
	)
	.get("/", async ({ user }) => {
		const [ws] = await db.select().from(workspace).where(eq(workspace.userId, user!.id)).limit(1);

		if (!ws) return [];

		const owned = await db.select().from(project).where(eq(project.workspaceId, ws.id));

		const shared = await db
			.select({ project })
			.from(projectMember)
			.innerJoin(project, eq(projectMember.projectId, project.id))
			.where(eq(projectMember.workspaceId, ws.id));

		const sharedProjects = shared.map((s) => s.project);
		const allProjects = [...owned, ...sharedProjects];

		const seen = new Set<string>();
		return allProjects.filter((p) => {
			if (seen.has(p.id)) return false;
			seen.add(p.id);
			return true;
		});
	})
	.get(
		"/:projectId",
		async ({ user, params, set }) => {
			const [ws] = await db.select().from(workspace).where(eq(workspace.userId, user!.id)).limit(1);

			if (!ws) {
				set.status = 404;
				return { error: "Workspace not found" };
			}

			const [proj] = await db
				.select()
				.from(project)
				.where(eq(project.id, params.projectId))
				.limit(1);

			if (!proj) {
				set.status = 404;
				return { error: "Project not found" };
			}

			if (proj.workspaceId !== ws.id) {
				const [membership] = await db
					.select()
					.from(projectMember)
					.where(and(eq(projectMember.projectId, proj.id), eq(projectMember.workspaceId, ws.id)))
					.limit(1);

				if (!membership) {
					set.status = 403;
					return { error: "Access denied" };
				}
			}

			return proj;
		},
		{
			params: t.Object({ projectId: t.String() }),
		},
	)
	.patch(
		"/:projectId",
		async ({ user, params, body, set }) => {
			const [ws] = await db.select().from(workspace).where(eq(workspace.userId, user!.id)).limit(1);

			if (!ws) {
				set.status = 404;
				return { error: "Workspace not found" };
			}

			const [proj] = await db
				.select()
				.from(project)
				.where(eq(project.id, params.projectId))
				.limit(1);

			if (!proj) {
				set.status = 404;
				return { error: "Project not found" };
			}

			const isOwner = proj.workspaceId === ws.id;
			if (!isOwner) {
				const [membership] = await db
					.select()
					.from(projectMember)
					.where(
						and(
							eq(projectMember.projectId, proj.id),
							eq(projectMember.workspaceId, ws.id),
							eq(projectMember.role, "admin"),
						),
					)
					.limit(1);

				if (!membership) {
					set.status = 403;
					return { error: "Access denied" };
				}
			}

			const [updated] = await db
				.update(project)
				.set({
					...(body.name !== undefined && { name: body.name }),
					...(body.description !== undefined && { description: body.description }),
				})
				.where(eq(project.id, params.projectId))
				.returning();

			return updated;
		},
		{
			params: t.Object({ projectId: t.String() }),
			body: t.Object({
				name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
				description: t.Optional(t.String({ maxLength: 500 })),
			}),
		},
	)
	.delete(
		"/:projectId",
		async ({ user, params, set }) => {
			const [ws] = await db.select().from(workspace).where(eq(workspace.userId, user!.id)).limit(1);

			if (!ws) {
				set.status = 404;
				return { error: "Workspace not found" };
			}

			const [proj] = await db
				.select()
				.from(project)
				.where(eq(project.id, params.projectId))
				.limit(1);

			if (!proj) {
				set.status = 404;
				return { error: "Project not found" };
			}

			if (proj.workspaceId !== ws.id) {
				set.status = 403;
				return { error: "Only the workspace owner can delete a project" };
			}

			await db.delete(project).where(eq(project.id, params.projectId));
			return { success: true };
		},
		{
			params: t.Object({ projectId: t.String() }),
		},
	);
