import { db } from "@mellow/database/client";
import { integration, task } from "@mellow/database/schema";
import type { IntegrationSource, WebhookEvent } from "@mellow/integrations";
import { normalizeWebhook, verifyWebhookSignature } from "@mellow/integrations";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

function parseDueDate(value: Date | string | null | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Date) return value;
	return new Date(value);
}

async function upsertTask(
	projectId: string,
	integrationId: string,
	event: WebhookEvent,
): Promise<string> {
	const dueDate = parseDueDate(event.task.dueDate);

	const existing = await db
		.select()
		.from(task)
		.where(and(eq(task.integrationId, integrationId), eq(task.externalId, event.task.externalId)))
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(task)
			.set({
				title: event.task.title,
				description: event.task.description,
				status: event.task.status,
				statusRaw: event.task.statusRaw,
				priority: event.task.priority,
				priorityRaw: event.task.priorityRaw,
				assignees: event.task.assignees,
				labels: event.task.labels,
				dueDate,
				rawPayload: event.rawPayload as Record<string, unknown>,
			})
			.where(eq(task.id, existing[0].id));

		return existing[0].id;
	}

	const id = crypto.randomUUID();
	await db.insert(task).values({
		id,
		projectId,
		integrationId,
		source: event.source,
		externalId: event.task.externalId,
		externalKey: event.task.externalKey,
		externalUrl: event.task.externalUrl,
		title: event.task.title,
		description: event.task.description,
		status: event.task.status,
		statusRaw: event.task.statusRaw,
		priority: event.task.priority,
		priorityRaw: event.task.priorityRaw,
		assignees: event.task.assignees,
		labels: event.task.labels,
		dueDate,
		rawPayload: event.rawPayload as Record<string, unknown>,
	});

	return id;
}

async function handleWebhook(
	source: IntegrationSource,
	projectId: string,
	request: Request,
	set: { status?: number | string },
) {
	const [integ] = await db
		.select()
		.from(integration)
		.where(and(eq(integration.projectId, projectId), eq(integration.source, source)))
		.limit(1);

	if (!integ) {
		set.status = 404;
		return { error: "Integration not found" };
	}

	const body = await request.text();

	if (integ.webhookSecret) {
		const valid = verifyWebhookSignature(source, body, request.headers, integ.webhookSecret);
		if (!valid) {
			set.status = 401;
			return { error: "Invalid webhook signature" };
		}
	}

	const payload = JSON.parse(body);
	const event = normalizeWebhook(source, payload);

	switch (event.action) {
		case "create":
		case "update": {
			await upsertTask(projectId, integ.id, event);
			break;
		}

		case "delete": {
			const [existing] = await db
				.select()
				.from(task)
				.where(and(eq(task.integrationId, integ.id), eq(task.externalId, event.task.externalId)))
				.limit(1);

			if (existing) {
				await db.delete(task).where(eq(task.id, existing.id));
			}
			break;
		}
	}

	return { ok: true };
}

export const webhookRoutes = new Elysia({ prefix: "/api/webhooks" })
	.post(
		"/linear/:projectId",
		async ({ params, request, set }) => {
			return handleWebhook("linear", params.projectId, request, set);
		},
		{ params: t.Object({ projectId: t.String() }) },
	)
	.post(
		"/plane/:projectId",
		async ({ params, request, set }) => {
			return handleWebhook("plane", params.projectId, request, set);
		},
		{ params: t.Object({ projectId: t.String() }) },
	)
	.post(
		"/jira/:projectId",
		async ({ params, request, set }) => {
			return handleWebhook("jira", params.projectId, request, set);
		},
		{ params: t.Object({ projectId: t.String() }) },
	);
