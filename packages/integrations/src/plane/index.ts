import { timingSafeEqual } from "node:crypto";
import type { NormalizedTask, WebhookEvent } from "../types.ts";

interface PlaneIssueData {
	id: string;
	name: string;
	description: unknown;
	description_html: string | null;
	priority: string;
	start_date: string | null;
	target_date: string | null;
	sequence_id: number;
	sort_order: number;
	completed_at: string | null;
	archived_at: string | null;
	is_draft: boolean;
	point: number | null;
	parent: string | null;
	state: { id: string; name: string; color: string; group: string };
	assignees: Array<{
		id: string;
		first_name: string;
		last_name: string;
		email: string;
		display_name: string;
	}>;
	labels: Array<{ id: string; name: string; color: string }>;
	cycle: { id: string; name: string } | null;
	module: { id: string; name: string } | null;
	workspace: string;
	project: string;
	created_by: string;
	updated_by: string;
	created_at: string;
	updated_at: string;
	external_source: string | null;
	external_id: string | null;
}

interface PlaneWebhookPayload {
	event: string;
	action: "create" | "update" | "delete";
	webhook_id: string;
	workspace_id: string;
	data: PlaneIssueData;
	activity: {
		field: string | null;
		old_value: string | null;
		new_value: string | null;
		actor: {
			id: string;
			first_name: string;
			last_name: string;
			email: string;
			display_name: string;
		};
		old_identifier: string | null;
		new_identifier: string | null;
	};
}

const PRIORITY_MAP: Record<string, number> = {
	urgent: 1,
	high: 2,
	medium: 3,
	low: 4,
	none: 0,
};

const STATUS_MAP: Record<string, string> = {
	backlog: "backlog",
	unstarted: "todo",
	started: "in_progress",
	completed: "done",
	cancelled: "cancelled",
	triage: "backlog",
};

export function verifyPlaneSignature(body: string, signature: string, secret: string): boolean {
	const hmac = new Bun.CryptoHasher("sha256", secret);
	hmac.update(body);
	const expected = Buffer.from(hmac.digest("hex"), "hex");
	const received = Buffer.from(signature, "hex");
	if (expected.byteLength !== received.byteLength) return false;
	return timingSafeEqual(expected, received);
}

function normalizeIssue(data: PlaneIssueData): NormalizedTask {
	const assignees: NormalizedTask["assignees"] = data.assignees.map((a) => ({
		externalId: a.id,
		name: a.display_name || `${a.first_name} ${a.last_name}`.trim(),
		email: a.email,
	}));

	const labels: NormalizedTask["labels"] = data.labels.map((l) => ({
		id: l.id,
		name: l.name,
		color: l.color,
	}));

	return {
		externalId: data.id,
		externalKey: String(data.sequence_id),
		externalUrl: null,
		externalApiUrl: null,
		title: data.name,
		description: data.description_html,
		status: STATUS_MAP[data.state.group] ?? "todo",
		statusRaw: data.state.name,
		priority: PRIORITY_MAP[data.priority] ?? 0,
		priorityRaw: data.priority,
		assignees,
		labels,
		dueDate: data.target_date ? new Date(data.target_date) : null,
	};
}

export function normalizePlaneWebhook(payload: unknown): WebhookEvent {
	const data = payload as PlaneWebhookPayload;

	const changedFields = data.activity?.field ? [data.activity.field] : undefined;

	return {
		source: "plane",
		action: data.action,
		task: normalizeIssue(data.data),
		rawPayload: payload,
		changedFields,
	};
}
