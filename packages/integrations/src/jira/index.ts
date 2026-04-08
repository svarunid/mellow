import { timingSafeEqual } from "node:crypto";
import type { NormalizedTask, WebhookEvent } from "../types.ts";

interface JiraUser {
	accountId: string;
	displayName: string;
	emailAddress?: string;
	active: boolean;
}

interface JiraIssue {
	id: string;
	self: string;
	key: string;
	fields: {
		summary: string;
		description: string | null;
		issuetype: { id: string; name: string; subtask: boolean };
		project: { id: string; key: string; name: string };
		status: {
			id: string;
			name: string;
			statusCategory: { id: number; key: string; name: string };
		};
		priority: { id: string; name: string } | null;
		assignee: JiraUser | null;
		reporter: JiraUser | null;
		creator: JiraUser | null;
		labels: string[];
		created: string;
		updated: string;
		duedate: string | null;
		parent?: { key: string; id: string };
		resolution: { id: string; name: string } | null;
	};
}

interface JiraChangelogItem {
	field: string;
	fieldId: string;
	fieldtype: string;
	from: string | null;
	fromString: string | null;
	to: string | null;
	toString: string | null;
}

interface JiraWebhookPayload {
	id: number;
	timestamp: number;
	webhookEvent: string;
	issue_event_type_name: string;
	user: JiraUser;
	issue: JiraIssue;
	changelog?: {
		id: string;
		items: JiraChangelogItem[];
	};
}

const PRIORITY_MAP: Record<string, number> = {
	Highest: 1,
	Critical: 1,
	High: 2,
	Medium: 3,
	Low: 4,
	Lowest: 0,
};

const STATUS_CATEGORY_MAP: Record<string, string> = {
	new: "todo",
	indeterminate: "in_progress",
	done: "done",
	undefined: "todo",
};

const ACTION_MAP: Record<string, "create" | "update" | "delete"> = {
	"jira:issue_created": "create",
	"jira:issue_updated": "update",
	"jira:issue_deleted": "delete",
};

export function verifyJiraSignature(body: string, signature: string, secret: string): boolean {
	const hmac = new Bun.CryptoHasher("sha256", secret);
	hmac.update(body);
	const expected = Buffer.from(hmac.digest("hex"), "hex");
	const raw = signature.startsWith("sha256=") ? signature.slice(7) : signature;
	const received = Buffer.from(raw, "hex");
	if (expected.byteLength !== received.byteLength) return false;
	return timingSafeEqual(expected, received);
}

function normalizeIssue(issue: JiraIssue): NormalizedTask {
	const fields = issue.fields;

	const assignees: NormalizedTask["assignees"] = [];
	if (fields.assignee) {
		assignees.push({
			externalId: fields.assignee.accountId,
			name: fields.assignee.displayName,
			email: fields.assignee.emailAddress,
		});
	}

	const labels: NormalizedTask["labels"] = fields.labels.map((name, i) => ({
		id: String(i),
		name,
	}));

	const priorityName = fields.priority?.name ?? "Medium";

	const baseUrl = issue.self.split("/rest/")[0];
	return {
		externalId: issue.id,
		externalKey: issue.key,
		externalUrl: `${baseUrl}/browse/${issue.key}`,
		externalApiUrl: issue.self,
		title: fields.summary,
		description: fields.description,
		status: STATUS_CATEGORY_MAP[fields.status.statusCategory.key] ?? "todo",
		statusRaw: fields.status.name,
		priority: PRIORITY_MAP[priorityName] ?? 3,
		priorityRaw: priorityName,
		assignees,
		labels,
		dueDate: fields.duedate ? new Date(fields.duedate) : null,
	};
}

export function normalizeJiraWebhook(payload: unknown): WebhookEvent {
	const data = payload as JiraWebhookPayload;

	const action = ACTION_MAP[data.webhookEvent] ?? "update";
	const changedFields = data.changelog?.items.map((item) => item.field);

	return {
		source: "jira",
		action,
		task: normalizeIssue(data.issue),
		rawPayload: payload,
		changedFields,
	};
}
