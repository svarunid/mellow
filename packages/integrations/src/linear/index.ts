import { timingSafeEqual } from "node:crypto";
import type { NormalizedTask, WebhookEvent } from "../types.ts";

interface LinearIssueData {
	id: string;
	number: number;
	identifier: string;
	title: string;
	description: string | null;
	priority: number;
	priorityLabel: string;
	estimate: number | null;
	createdAt: string;
	updatedAt: string;
	startedAt: string | null;
	completedAt: string | null;
	canceledAt: string | null;
	archivedAt: string | null;
	dueDate: string | null;
	teamId: string;
	stateId: string;
	state?: { id: string; name: string; type: string };
	assigneeId: string | null;
	assignee?: { id: string; name: string; email: string };
	creatorId: string;
	cycleId: string | null;
	projectId: string | null;
	labelIds: string[];
	labels?: Array<{ id: string; name: string; color: string }>;
	subscriberIds: string[];
	url: string;
}

interface LinearWebhookPayload {
	action: "create" | "update" | "remove";
	type: string;
	data: LinearIssueData;
	updatedFrom?: Record<string, unknown>;
	url: string;
	createdAt: string;
	organizationId: string;
}

const STATUS_MAP: Record<string, string> = {
	triage: "backlog",
	backlog: "backlog",
	unstarted: "todo",
	started: "in_progress",
	completed: "done",
	canceled: "cancelled",
};

export function verifyLinearSignature(body: string, signature: string, secret: string): boolean {
	const hmac = new Bun.CryptoHasher("sha256", secret);
	hmac.update(body);
	const expected = Buffer.from(hmac.digest("hex"), "hex");
	const received = Buffer.from(signature, "hex");
	if (expected.byteLength !== received.byteLength) return false;
	return timingSafeEqual(expected, received);
}

function normalizeStatus(state?: { type: string; name: string }): {
	status: string;
	statusRaw: string;
} {
	if (!state) {
		return { status: "todo", statusRaw: "unknown" };
	}
	return {
		status: STATUS_MAP[state.type] ?? "todo",
		statusRaw: state.name,
	};
}

function normalizeIssue(data: LinearIssueData): NormalizedTask {
	const { status, statusRaw } = normalizeStatus(data.state);

	const assignees: NormalizedTask["assignees"] = [];
	if (data.assignee) {
		assignees.push({
			externalId: data.assignee.id,
			name: data.assignee.name,
			email: data.assignee.email,
		});
	}

	const labels: NormalizedTask["labels"] =
		data.labels?.map((l) => ({ id: l.id, name: l.name, color: l.color })) ?? [];

	return {
		externalId: data.id,
		externalKey: data.identifier,
		externalUrl: data.url ?? null,
		externalApiUrl: null,
		title: data.title,
		description: data.description,
		status,
		statusRaw,
		priority: data.priority,
		priorityRaw: data.priorityLabel,
		assignees,
		labels,
		dueDate: data.dueDate ? new Date(data.dueDate) : null,
	};
}

export function normalizeLinearWebhook(payload: unknown): WebhookEvent {
	const data = payload as LinearWebhookPayload;

	const actionMap: Record<string, "create" | "update" | "delete"> = {
		create: "create",
		update: "update",
		remove: "delete",
	};

	const changedFields = data.updatedFrom ? Object.keys(data.updatedFrom) : undefined;

	return {
		source: "linear",
		action: actionMap[data.action] ?? "update",
		task: normalizeIssue(data.data),
		rawPayload: payload,
		changedFields,
	};
}
