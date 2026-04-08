export type IntegrationSource = "linear" | "plane" | "jira";

export type WebhookAction = "create" | "update" | "delete";

export interface NormalizedTask {
	externalId: string;
	externalKey: string | null;
	externalUrl: string | null;
	externalApiUrl: string | null;
	title: string;
	description: string | null;
	status: string;
	statusRaw: string;
	priority: number;
	priorityRaw: string;
	assignees: Array<{ externalId: string; name: string; email?: string }>;
	labels: Array<{ id: string; name: string; color?: string }>;
	dueDate: Date | string | null;
}

export interface WebhookEvent {
	source: IntegrationSource;
	action: WebhookAction;
	task: NormalizedTask;
	rawPayload: unknown;
	changedFields?: string[];
}
