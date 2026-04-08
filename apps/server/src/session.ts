import { db } from "@mellow/database/client";
import { workspace } from "@mellow/database/schema";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import type { AuthSession, AuthUser } from "./types";

export const requireAuth = new Elysia({ name: "requireAuth" })
	.derive({ as: "scoped" }, ({ request }) => {
		const userId = request.headers.get("x-user-id");
		const userEmail = request.headers.get("x-user-email");
		const userName = request.headers.get("x-user-name");

		if (!userId || !userEmail || !userName) {
			return { authUser: null as AuthUser | null, authSession: null as AuthSession | null };
		}

		const user: AuthUser = {
			id: userId,
			name: userName,
			email: userEmail,
			image: request.headers.get("x-user-image") ?? null,
		};

		const session: AuthSession = {
			id: request.headers.get("x-session-id") ?? userId,
			userId,
			activeOrganizationId: request.headers.get("x-session-active-org-id") ?? null,
			activeTeamId: request.headers.get("x-session-active-team-id") ?? null,
		};

		return { authUser: user, authSession: session };
	})
	.onBeforeHandle({ as: "scoped" }, ({ authUser, set }) => {
		if (!authUser) {
			set.status = 401;
			return { error: "Unauthorized" };
		}
	})
	.resolve({ as: "scoped" }, async ({ authUser, authSession }) => {
		const user = authUser!;
		const session = authSession!;

		const [existing] = await db
			.select()
			.from(workspace)
			.where(eq(workspace.userId, user.id))
			.limit(1);

		if (!existing) {
			await db.insert(workspace).values({
				id: crypto.randomUUID(),
				userId: user.id,
				name: `${user.name}'s workspace`,
			});
		}

		return { user, session };
	});
