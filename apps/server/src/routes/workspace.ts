import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "@mellow/database/client";
import { workspace } from "@mellow/database/schema";
import { requireAuth } from "../session";

export const workspaceRoutes = new Elysia({ prefix: "/api/workspaces" })
	.use(requireAuth)
	.get("/me", async ({ user, set }) => {
		const [result] = await db
			.select()
			.from(workspace)
			.where(eq(workspace.userId, user!.id))
			.limit(1);

		if (!result) {
			set.status = 404;
			return { error: "Workspace not found" };
		}

		return result;
	})
	.patch(
		"/me",
		async ({ user, body, set }) => {
			const [updated] = await db
				.update(workspace)
				.set({ name: body.name })
				.where(eq(workspace.userId, user!.id))
				.returning();

			if (!updated) {
				set.status = 404;
				return { error: "Workspace not found" };
			}

			return updated;
		},
		{
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 100 }),
			}),
		},
	);
