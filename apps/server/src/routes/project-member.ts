import { db } from "@mellow/database/client";
import { project, projectMember, user, workspace } from "@mellow/database/schema";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { requireAuth } from "../session";

export const projectMemberRoutes = new Elysia({ prefix: "/api/projects/:projectId/members" })
	.use(requireAuth)
	.guard({ params: t.Object({ projectId: t.String() }) })
	.resolve(async ({ user: currentUser, params, set }) => {
		const [ws] = await db
			.select()
			.from(workspace)
			.where(eq(workspace.userId, currentUser!.id))
			.limit(1);

		if (!ws) {
			set.status = 404;
			return { error: "Workspace not found" } as never;
		}

		const [proj] = await db.select().from(project).where(eq(project.id, params.projectId)).limit(1);

		if (!proj) {
			set.status = 404;
			return { error: "Project not found" } as never;
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
				return { error: "Access denied" } as never;
			}
		}

		return { currentWorkspace: ws, currentProject: proj };
	})
	.get("/", async ({ currentProject }) => {
		const members = await db
			.select({
				id: projectMember.id,
				role: projectMember.role,
				createdAt: projectMember.createdAt,
				workspace: {
					id: workspace.id,
					name: workspace.name,
				},
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
				},
			})
			.from(projectMember)
			.innerJoin(workspace, eq(projectMember.workspaceId, workspace.id))
			.innerJoin(user, eq(workspace.userId, user.id))
			.where(eq(projectMember.projectId, currentProject.id));

		return members;
	})
	.post(
		"/",
		async ({ currentProject, body, set }) => {
			const [targetUser] = await db.select().from(user).where(eq(user.email, body.email)).limit(1);

			if (!targetUser) {
				set.status = 404;
				return { error: "User not found" };
			}

			const [targetWorkspace] = await db
				.select()
				.from(workspace)
				.where(eq(workspace.userId, targetUser.id))
				.limit(1);

			if (!targetWorkspace) {
				set.status = 404;
				return { error: "User workspace not found" };
			}

			const [existing] = await db
				.select()
				.from(projectMember)
				.where(
					and(
						eq(projectMember.projectId, currentProject.id),
						eq(projectMember.workspaceId, targetWorkspace.id),
					),
				)
				.limit(1);

			if (existing) {
				set.status = 409;
				return { error: "User is already a member of this project" };
			}

			const [created] = await db
				.insert(projectMember)
				.values({
					id: crypto.randomUUID(),
					projectId: currentProject.id,
					workspaceId: targetWorkspace.id,
					role: body.role ?? "member",
				})
				.returning();

			set.status = 201;
			return created;
		},
		{
			body: t.Object({
				email: t.String({ format: "email" }),
				role: t.Optional(t.Union([t.Literal("admin"), t.Literal("member"), t.Literal("viewer")])),
			}),
		},
	)
	.delete(
		"/:memberId",
		async ({ currentProject, params, set }) => {
			const [existing] = await db
				.select()
				.from(projectMember)
				.where(
					and(
						eq(projectMember.id, params.memberId),
						eq(projectMember.projectId, currentProject.id),
					),
				)
				.limit(1);

			if (!existing) {
				set.status = 404;
				return { error: "Member not found" };
			}

			await db.delete(projectMember).where(eq(projectMember.id, params.memberId));
			return { success: true };
		},
		{
			params: t.Object({ projectId: t.String(), memberId: t.String() }),
		},
	);
