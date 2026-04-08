export type {
	IntegrationSource,
	NormalizedTask,
	WebhookAction,
	WebhookEvent,
} from "./types.ts";

import { normalizeJiraWebhook, verifyJiraSignature } from "./jira/index.ts";
import { normalizeLinearWebhook, verifyLinearSignature } from "./linear/index.ts";
import { normalizePlaneWebhook, verifyPlaneSignature } from "./plane/index.ts";
import type { IntegrationSource, WebhookEvent } from "./types.ts";

export function verifyWebhookSignature(
	source: IntegrationSource,
	body: string,
	headers: Headers,
	secret: string,
): boolean {
	switch (source) {
		case "linear": {
			const signature = headers.get("linear-signature") ?? "";
			return verifyLinearSignature(body, signature, secret);
		}
		case "plane": {
			const signature = headers.get("x-plane-signature") ?? "";
			return verifyPlaneSignature(body, signature, secret);
		}
		case "jira": {
			const signature = headers.get("x-hub-signature") ?? "";
			return verifyJiraSignature(body, signature, secret);
		}
	}
}

export function normalizeWebhook(source: IntegrationSource, payload: unknown): WebhookEvent {
	switch (source) {
		case "linear":
			return normalizeLinearWebhook(payload);
		case "plane":
			return normalizePlaneWebhook(payload);
		case "jira":
			return normalizeJiraWebhook(payload);
	}
}
