import { Config, Effect, Redacted } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { makeHttpExecutor } from "./http";
import {
	DiagnosticsError,
	EndpointResolveError,
	SandboxHttpError,
	SandboxNetworkError,
	SandboxNotFoundError,
	SandboxProvisionError,
	SandboxStateConflictError,
} from "./errors";
import { EndpointInfo, RenewResponse, SandboxInfo, SandboxList } from "./schemas";

export interface CreateSandboxParams {
	readonly image: string;
	readonly entrypoint?: readonly string[];
	readonly timeoutSeconds?: number | null;
	readonly resourceLimits?: Record<string, string>;
	readonly env?: Record<string, string>;
	readonly metadata?: Record<string, string>;
	readonly networkPolicy?: {
		readonly defaultAction?: "allow" | "deny";
		readonly egress?: readonly { readonly action: string; readonly target: string }[];
	};
	readonly volumes?: readonly Record<string, unknown>[];
	readonly extensions?: Record<string, string>;
}

export interface ListSandboxParams {
	readonly state?: readonly string[];
	readonly metadata?: Record<string, string>;
	readonly page?: number;
	readonly pageSize?: number;
}

type ServerShape = {
	readonly create: (
		params: CreateSandboxParams,
	) => Effect.Effect<SandboxInfo, SandboxProvisionError | SandboxNetworkError>;
	readonly list: (
		params?: ListSandboxParams,
	) => Effect.Effect<SandboxList, SandboxHttpError | SandboxNetworkError>;
	readonly get: (
		sandboxId: string,
	) => Effect.Effect<SandboxInfo, SandboxNotFoundError | SandboxNetworkError>;
	readonly destroy: (
		sandboxId: string,
	) => Effect.Effect<void, SandboxNotFoundError | SandboxNetworkError>;
	readonly pause: (
		sandboxId: string,
	) => Effect.Effect<void, SandboxNotFoundError | SandboxStateConflictError | SandboxNetworkError>;
	readonly resume: (
		sandboxId: string,
	) => Effect.Effect<void, SandboxNotFoundError | SandboxStateConflictError | SandboxNetworkError>;
	readonly renewExpiration: (
		sandboxId: string,
		expiresAt: Date,
	) => Effect.Effect<RenewResponse, SandboxNotFoundError | SandboxNetworkError>;
	readonly getEndpoint: (
		sandboxId: string,
		port: number,
	) => Effect.Effect<EndpointInfo, EndpointResolveError | SandboxNetworkError>;
	readonly logs: (
		sandboxId: string,
		opts?: { readonly tail?: number; readonly since?: string },
	) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly inspect: (
		sandboxId: string,
	) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly events: (
		sandboxId: string,
		opts?: { readonly limit?: number },
	) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly summary: (
		sandboxId: string,
		opts?: { readonly tail?: number; readonly eventLimit?: number },
	) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
};

export class SandboxServer extends Effect.Service<SandboxServer>()("@mellow/sandbox/Server", {
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;

		const domain = yield* Config.string("OPENSANDBOX_DOMAIN").pipe(
			Config.withDefault("localhost:8080"),
		);
		const protocol = yield* Config.string("OPENSANDBOX_PROTOCOL").pipe(Config.withDefault("http"));
		const apiKey = yield* Config.redacted("OPENSANDBOX_API_KEY").pipe(
			Config.map((r) => Redacted.value(r)),
			Config.withDefault(""),
		);

		const baseUrl = `${protocol}://${domain}`;

		const withAuth = (req: HttpClientRequest.HttpClientRequest) =>
			req.pipe(
				HttpClientRequest.setHeader("OPEN-SANDBOX-API-KEY", apiKey),
				HttpClientRequest.setHeader("content-type", "application/json"),
			);

		const mapNetworkError =
			(url: string) =>
			(e: unknown): SandboxNetworkError =>
				new SandboxNetworkError({
					url,
					message: e instanceof Error ? e.message : String(e),
				});

		const http = makeHttpExecutor(httpClient);

		const create: ServerShape["create"] = (params) =>
			http
				.json(
					withAuth(
						HttpClientRequest.post(`${baseUrl}/v1/sandboxes`).pipe(
							HttpClientRequest.bodyUnsafeJson({
								image: { uri: params.image },
								entrypoint: params.entrypoint ?? ["tail", "-f", "/dev/null"],
								timeout: params.timeoutSeconds,
								resourceLimits: params.resourceLimits ?? {},
								env: params.env,
								metadata: params.metadata,
								networkPolicy: params.networkPolicy,
								volumes: params.volumes,
								extensions: params.extensions,
							}),
						),
					),
					SandboxInfo,
				)
				.pipe(
					Effect.mapError((e) =>
						e instanceof SandboxNetworkError
							? e
							: new SandboxProvisionError({
									message: e instanceof Error ? e.message : String(e),
								}),
					),
				);

		const list: ServerShape["list"] = (params) => {
			const query = new URLSearchParams();
			if (params?.state) for (const s of params.state) query.append("state", s);
			if (params?.page) query.set("page", String(params.page));
			if (params?.pageSize) query.set("pageSize", String(params.pageSize));
			const qs = query.toString();
			const url = `${baseUrl}/v1/sandboxes${qs ? `?${qs}` : ""}`;
			return http.json(withAuth(HttpClientRequest.get(url)), SandboxList).pipe(
				Effect.mapError((e) =>
					e instanceof SandboxNetworkError
						? e
						: new SandboxHttpError({
								url,
								statusCode: 0,
								body: e instanceof Error ? e.message : String(e),
							}),
				),
			);
		};

		const get: ServerShape["get"] = (sandboxId) => {
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}`;
			return http
				.json(withAuth(HttpClientRequest.get(url)), SandboxInfo)
				.pipe(
					Effect.mapError((e) =>
						e instanceof SandboxNetworkError ? e : new SandboxNotFoundError({ sandboxId }),
					),
				);
		};

		const destroy: ServerShape["destroy"] = (sandboxId) => {
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}`;
			return http
				.void(withAuth(HttpClientRequest.del(url)))
				.pipe(
					Effect.mapError((e) =>
						e instanceof SandboxNetworkError ? e : new SandboxNotFoundError({ sandboxId }),
					),
				);
		};

		const mapLifecycleError =
			(sandboxId: string, url: string) =>
			(e: unknown): SandboxNotFoundError | SandboxStateConflictError | SandboxNetworkError => {
				const status =
					e && typeof e === "object" && "status" in e ? (e as { status: number }).status : 0;
				if (status === 404) return new SandboxNotFoundError({ sandboxId });
				if (status === 409) return new SandboxStateConflictError({ sandboxId, message: String(e) });
				return mapNetworkError(url)(e);
			};

		const pause: ServerShape["pause"] = (sandboxId) => {
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/pause`;
			return http
				.void(withAuth(HttpClientRequest.post(url)))
				.pipe(Effect.mapError(mapLifecycleError(sandboxId, url)));
		};

		const resume: ServerShape["resume"] = (sandboxId) => {
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/resume`;
			return http
				.void(withAuth(HttpClientRequest.post(url)))
				.pipe(Effect.mapError(mapLifecycleError(sandboxId, url)));
		};

		const renewExpiration: ServerShape["renewExpiration"] = (sandboxId, expiresAt) => {
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/renew-expiration`;
			return http
				.json(
					withAuth(
						HttpClientRequest.post(url).pipe(
							HttpClientRequest.bodyUnsafeJson({ expiresAt: expiresAt.toISOString() }),
						),
					),
					RenewResponse,
				)
				.pipe(
					Effect.mapError((e) =>
						e instanceof SandboxNetworkError ? e : new SandboxNotFoundError({ sandboxId }),
					),
				);
		};

		const getEndpoint: ServerShape["getEndpoint"] = (sandboxId, port) => {
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/endpoints/${port}`;
			return http.json(withAuth(HttpClientRequest.get(url)), EndpointInfo).pipe(
				Effect.mapError((e) =>
					e instanceof SandboxNetworkError
						? e
						: new EndpointResolveError({
								sandboxId,
								port,
								message: e instanceof Error ? e.message : String(e),
							}),
				),
			);
		};

		const diagError = (sandboxId: string) => (e: unknown) =>
			e instanceof SandboxNetworkError
				? e
				: new DiagnosticsError({
						sandboxId,
						message: e instanceof Error ? e.message : String(e),
					});

		const logs: ServerShape["logs"] = (sandboxId, opts) => {
			const query = new URLSearchParams();
			if (opts?.tail) query.set("tail", String(opts.tail));
			if (opts?.since) query.set("since", opts.since);
			const qs = query.toString();
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/diagnostics/logs${qs ? `?${qs}` : ""}`;
			return http
				.text(withAuth(HttpClientRequest.get(url)))
				.pipe(Effect.mapError(diagError(sandboxId)));
		};

		const inspect: ServerShape["inspect"] = (sandboxId) =>
			http
				.text(
					withAuth(
						HttpClientRequest.get(`${baseUrl}/v1/sandboxes/${sandboxId}/diagnostics/inspect`),
					),
				)
				.pipe(Effect.mapError(diagError(sandboxId)));

		const events: ServerShape["events"] = (sandboxId, opts) => {
			const query = new URLSearchParams();
			if (opts?.limit) query.set("limit", String(opts.limit));
			const qs = query.toString();
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/diagnostics/events${qs ? `?${qs}` : ""}`;
			return http
				.text(withAuth(HttpClientRequest.get(url)))
				.pipe(Effect.mapError(diagError(sandboxId)));
		};

		const summary: ServerShape["summary"] = (sandboxId, opts) => {
			const query = new URLSearchParams();
			if (opts?.tail) query.set("tail", String(opts.tail));
			if (opts?.eventLimit) query.set("event_limit", String(opts.eventLimit));
			const qs = query.toString();
			const url = `${baseUrl}/v1/sandboxes/${sandboxId}/diagnostics/summary${qs ? `?${qs}` : ""}`;
			return http
				.text(withAuth(HttpClientRequest.get(url)))
				.pipe(Effect.mapError(diagError(sandboxId)));
		};

		return {
			create,
			list,
			get,
			destroy,
			pause,
			resume,
			renewExpiration,
			getEndpoint,
			logs,
			inspect,
			events,
			summary,
		};
	}),
	dependencies: [FetchHttpClient.layer],
}) {}
