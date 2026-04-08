import { db } from "@mellow/database/client";
import { integration, project, projectMember, workspace } from "@mellow/database/schema";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { requireAuth } from "../session";

export const integrationRoutes = new Elysia({ prefix: "/api/projects/:projectId/integrations" })
	.use(requireAuth)
	.guard(
		{
			params: t.Object({ projectId: t.String() }),
		},
		(app) =>
			app
				.resolve(async ({ user, params, set }) => {
					const [ws] = await db
						.select()
						.from(workspace)
						.where(eq(workspace.userId, user!.id))
						.limit(1);

					if (!ws) {
						set.status = 404;
						return { error: "Workspace not found" } as never;
					}

					const [proj] = await db
						.select()
						.from(project)
						.where(eq(project.id, params.projectId))
						.limit(1);

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

					return { ws, proj };
				})
				.post(
					"/",
					async ({ params, body, set }) => {
						const existing = await db
							.select()
							.from(integration)
							.where(
								and(
									eq(integration.projectId, params.projectId),
									eq(integration.source, body.source),
								),
							)
							.limit(1);

						if (existing.length > 0) {
							set.status = 409;
							return { error: "Integration for this source already exists" };
						}

						const [created] = await db
							.insert(integration)
							.values({
								id: crypto.randomUUID(),
								projectId: params.projectId,
								source: body.source,
								webhookSecret: body.webhookSecret ?? null,
								externalProjectId: body.externalProjectId ?? null,
								config: body.config ?? null,
							})
							.returning();

						set.status = 201;
						return created;
					},
					{
						body: t.Object({
							source: t.Union([t.Literal("linear"), t.Literal("plane"), t.Literal("jira")]),
							webhookSecret: t.Optional(t.String()),
							externalProjectId: t.Optional(t.String()),
							config: t.Optional(t.Record(t.String(), t.Unknown())),
						}),
					},
				)
				.get("/", async ({ params }) => {
					return db.select().from(integration).where(eq(integration.projectId, params.projectId));
				})
				.delete(
					"/:integrationId",
					async ({ params, set }) => {
						const [integ] = await db
							.select()
							.from(integration)
							.where(
								and(
									eq(integration.id, params.integrationId),
									eq(integration.projectId, params.projectId),
								),
							)
							.limit(1);

						if (!integ) {
							set.status = 404;
							return { error: "Integration not found" };
						}

						await db.delete(integration).where(eq(integration.id, params.integrationId));
						return { success: true };
					},
					{
						params: t.Object({
							projectId: t.String(),
							integrationId: t.String(),
						}),
					},
				),
	);
