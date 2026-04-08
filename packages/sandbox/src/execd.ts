import { Effect, Schema, Stream } from "effect";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import { makeHttpExecutor } from "./http";
import {
	CodeContextError,
	CommandStreamError,
	type CommandTimeoutError,
	DirectoryCreateError,
	FilePermissionError,
	FileReadError,
	FileWriteError,
	SandboxHttpError,
	SandboxNetworkError,
	SessionError,
} from "./errors";
import {
	CodeContext,
	CommandStatusResponse,
	FileInfo,
	SessionResponse,
	SystemMetrics,
} from "./schemas";
import { type ExecResult, type SSEFrame, collectExecResult, parseExecdSSE } from "./sse";

export type { ExecResult, SSEFrame } from "./sse";

export interface ExecdConnection {
	readonly baseUrl: string;
	readonly accessToken: string;
}

export interface ExecOptions {
	readonly timeoutSeconds?: number;
	readonly cwd?: string;
	readonly envs?: Record<string, string>;
	readonly uid?: number;
	readonly gid?: number;
}

export interface CommandLogs {
	readonly content: string;
	readonly cursor?: number;
}

export interface ExecdClient {
	readonly ping: () => Effect.Effect<void, SandboxNetworkError>;

	readonly exec: (
		command: string,
		opts?: ExecOptions,
	) => Effect.Effect<ExecResult, CommandTimeoutError | CommandStreamError | SandboxNetworkError>;
	readonly execStream: (
		command: string,
		opts?: ExecOptions,
	) => Stream.Stream<SSEFrame, CommandStreamError | SandboxNetworkError>;
	readonly execBackground: (
		command: string,
		opts?: ExecOptions,
	) => Effect.Effect<ExecResult, CommandStreamError | SandboxNetworkError>;
	readonly commandStatus: (
		commandId: string,
	) => Effect.Effect<CommandStatusResponse, SandboxHttpError | SandboxNetworkError>;
	readonly commandLogs: (
		commandId: string,
		cursor?: number,
	) => Effect.Effect<CommandLogs, SandboxHttpError | SandboxNetworkError>;
	readonly killCommand: (
		commandId: string,
	) => Effect.Effect<void, SandboxHttpError | SandboxNetworkError>;

	readonly createSession: (
		cwd?: string,
	) => Effect.Effect<string, SessionError | SandboxNetworkError>;
	readonly sessionExec: (
		sessionId: string,
		command: string,
		opts?: ExecOptions,
	) => Effect.Effect<ExecResult, CommandTimeoutError | CommandStreamError | SandboxNetworkError>;
	readonly deleteSession: (
		sessionId: string,
	) => Effect.Effect<void, SessionError | SandboxNetworkError>;

	readonly createCodeContext: (
		language: string,
	) => Effect.Effect<CodeContext, CodeContextError | SandboxNetworkError>;
	readonly listCodeContexts: (
		language: string,
	) => Effect.Effect<readonly CodeContext[], CodeContextError | SandboxNetworkError>;
	readonly getCodeContext: (
		contextId: string,
	) => Effect.Effect<CodeContext, CodeContextError | SandboxNetworkError>;
	readonly deleteCodeContext: (
		contextId: string,
	) => Effect.Effect<void, CodeContextError | SandboxNetworkError>;
	readonly deleteCodeContexts: (
		language: string,
	) => Effect.Effect<void, CodeContextError | SandboxNetworkError>;
	readonly executeCode: (
		code: string,
		context?: { readonly id?: string; readonly language?: string },
	) => Stream.Stream<SSEFrame, CodeContextError | SandboxNetworkError>;
	readonly interruptCode: (
		id: string,
	) => Effect.Effect<void, CodeContextError | SandboxNetworkError>;

	readonly readFile: (
		path: string,
	) => Effect.Effect<Uint8Array, FileReadError | SandboxNetworkError>;
	readonly readTextFile: (
		path: string,
	) => Effect.Effect<string, FileReadError | SandboxNetworkError>;
	readonly writeFile: (
		path: string,
		content: string | Uint8Array,
	) => Effect.Effect<void, FileWriteError | SandboxNetworkError>;
	readonly fileInfo: (
		paths: readonly string[],
	) => Effect.Effect<Record<string, FileInfo>, SandboxHttpError | SandboxNetworkError>;
	readonly deleteFiles: (
		paths: readonly string[],
	) => Effect.Effect<void, SandboxHttpError | SandboxNetworkError>;
	readonly moveFiles: (
		entries: readonly { readonly src: string; readonly dest: string }[],
	) => Effect.Effect<void, SandboxHttpError | SandboxNetworkError>;
	readonly searchFiles: (
		path: string,
		pattern?: string,
	) => Effect.Effect<readonly FileInfo[], SandboxHttpError | SandboxNetworkError>;
	readonly replaceInFiles: (
		replacements: Record<string, { readonly old: string; readonly new: string }>,
	) => Effect.Effect<void, SandboxHttpError | SandboxNetworkError>;
	readonly setPermissions: (
		perms: Record<
			string,
			{ readonly owner?: string; readonly group?: string; readonly mode?: number }
		>,
	) => Effect.Effect<void, FilePermissionError | SandboxNetworkError>;

	readonly createDirectories: (
		dirs:
			| readonly string[]
			| Record<
					string,
					{ readonly owner?: string; readonly group?: string; readonly mode?: number }
			  >,
	) => Effect.Effect<void, DirectoryCreateError | SandboxNetworkError>;
	readonly deleteDirectories: (
		paths: readonly string[],
	) => Effect.Effect<void, SandboxHttpError | SandboxNetworkError>;

	readonly metrics: () => Effect.Effect<SystemMetrics, SandboxHttpError | SandboxNetworkError>;
	readonly watchMetrics: () => Stream.Stream<SystemMetrics, SandboxHttpError | SandboxNetworkError>;
}

export class SandboxExecd extends Effect.Service<SandboxExecd>()("@mellow/sandbox/Execd", {
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;

		const connect = (conn: ExecdConnection): ExecdClient => {
			const withAuth = (req: HttpClientRequest.HttpClientRequest) =>
				req.pipe(HttpClientRequest.setHeader("X-EXECD-ACCESS-TOKEN", conn.accessToken));

			const withJson = (req: HttpClientRequest.HttpClientRequest) =>
				withAuth(req).pipe(HttpClientRequest.setHeader("content-type", "application/json"));

			const http = makeHttpExecutor(httpClient);

			const sseStream = (req: HttpClientRequest.HttpClientRequest) =>
				HttpClientResponse.stream(
					httpClient.execute(withJson(req)).pipe(
						Effect.tap((response) => {
							if (response.status >= 400) {
								return response.text.pipe(
									Effect.orElseSucceed(() => ""),
									Effect.flatMap((body) =>
										Effect.fail(
											new CommandStreamError({
												message: `execd ${response.status}: ${body}`,
											}),
										),
									),
								);
							}
							return Effect.void;
						}),
					),
				).pipe(
					Stream.decodeText(),
					parseExecdSSE,
					Stream.mapError((e): CommandStreamError | SandboxNetworkError =>
						e instanceof CommandStreamError ? e : new CommandStreamError({ message: String(e) }),
					),
				);

			const ping: ExecdClient["ping"] = () =>
				http.void(withAuth(HttpClientRequest.get(`${conn.baseUrl}/ping`))).pipe(
					Effect.mapError(
						(e) =>
							new SandboxNetworkError({
								url: `${conn.baseUrl}/ping`,
								message: e instanceof Error ? e.message : String(e),
							}),
					),
				);

			const commandBody = (command: string, opts?: ExecOptions, background = false) => ({
				command,
				cwd: opts?.cwd,
				timeout: opts?.timeoutSeconds ? opts.timeoutSeconds * 1000 : undefined,
				background,
				uid: opts?.uid,
				gid: opts?.gid,
				envs: opts?.envs,
			});

			const execStream: ExecdClient["execStream"] = (command, opts) =>
				sseStream(
					HttpClientRequest.post(`${conn.baseUrl}/command`).pipe(
						HttpClientRequest.bodyUnsafeJson(commandBody(command, opts)),
					),
				);

			const exec: ExecdClient["exec"] = (command, opts) =>
				collectExecResult(execStream(command, opts)).pipe(
					Effect.mapError((e) => {
						if (e._tag === "CommandStreamError" || e._tag === "SandboxNetworkError") return e;
						return new CommandStreamError({ message: String(e) });
					}),
				);

			const execBackground: ExecdClient["execBackground"] = (command, opts) =>
				collectExecResult(
					sseStream(
						HttpClientRequest.post(`${conn.baseUrl}/command`).pipe(
							HttpClientRequest.bodyUnsafeJson(commandBody(command, opts, true)),
						),
					),
				).pipe(
					Effect.mapError((e) => {
						if (e._tag === "CommandStreamError" || e._tag === "SandboxNetworkError") return e;
						return new CommandStreamError({ message: String(e) });
					}),
				);

			const commandStatus: ExecdClient["commandStatus"] = (commandId) =>
				http
					.json(
						withJson(HttpClientRequest.get(`${conn.baseUrl}/command/status/${commandId}`)),
						CommandStatusResponse,
					)
					.pipe(
						Effect.mapError(
							(e) =>
								new SandboxHttpError({
									url: `${conn.baseUrl}/command/status/${commandId}`,
									statusCode: 0,
									body: String(e),
								}),
						),
					);

			const commandLogs: ExecdClient["commandLogs"] = (commandId, cursor) => {
				const qs = cursor !== undefined ? `?cursor=${cursor}` : "";
				const url = `${conn.baseUrl}/command/${commandId}/logs${qs}`;
				return Effect.gen(function* () {
					const response = yield* httpClient.execute(withAuth(HttpClientRequest.get(url)));
					const content = yield* response.text;
					const cursorHeader = response.headers["execd-commands-tail-cursor"];
					return {
						content,
						cursor: cursorHeader ? Number.parseInt(cursorHeader, 10) : undefined,
					} as CommandLogs;
				}).pipe(
					Effect.scoped,
					Effect.mapError((e) => new SandboxHttpError({ url, statusCode: 0, body: String(e) })),
				);
			};

			const killCommand: ExecdClient["killCommand"] = (commandId) =>
				http
					.void(
						withAuth(
							HttpClientRequest.del(`${conn.baseUrl}/command`).pipe(
								HttpClientRequest.setUrlParam("id", commandId),
							),
						),
					)
					.pipe(
						Effect.mapError(
							(e) =>
								new SandboxHttpError({
									url: `${conn.baseUrl}/command`,
									statusCode: 0,
									body: String(e),
								}),
						),
					);

			const createSession: ExecdClient["createSession"] = (cwd) =>
				http
					.json(
						withJson(
							HttpClientRequest.post(`${conn.baseUrl}/session`).pipe(
								HttpClientRequest.bodyUnsafeJson(cwd ? { cwd } : {}),
							),
						),
						SessionResponse,
					)
					.pipe(
						Effect.map((r) => r.session_id),
						Effect.mapError((e) => new SessionError({ sessionId: "", message: String(e) })),
					);

			const sessionExec: ExecdClient["sessionExec"] = (sessionId, command, opts) =>
				collectExecResult(
					sseStream(
						HttpClientRequest.post(`${conn.baseUrl}/session/${sessionId}/run`).pipe(
							HttpClientRequest.bodyUnsafeJson({
								command,
								cwd: opts?.cwd,
								timeout: opts?.timeoutSeconds ? opts.timeoutSeconds * 1000 : undefined,
							}),
						),
					),
				).pipe(
					Effect.mapError((e) => {
						if (e._tag === "CommandStreamError" || e._tag === "SandboxNetworkError") return e;
						return new CommandStreamError({ message: String(e) });
					}),
				);

			const deleteSession: ExecdClient["deleteSession"] = (sessionId) =>
				http
					.void(withAuth(HttpClientRequest.del(`${conn.baseUrl}/session/${sessionId}`)))
					.pipe(Effect.mapError((e) => new SessionError({ sessionId, message: String(e) })));

			const createCodeContext: ExecdClient["createCodeContext"] = (language) =>
				http
					.json(
						withJson(
							HttpClientRequest.post(`${conn.baseUrl}/code/context`).pipe(
								HttpClientRequest.bodyUnsafeJson({ language }),
							),
						),
						CodeContext,
					)
					.pipe(Effect.mapError((e) => new CodeContextError({ message: String(e) })));

			const listCodeContexts: ExecdClient["listCodeContexts"] = (language) =>
				http
					.json(
						withJson(
							HttpClientRequest.get(`${conn.baseUrl}/code/contexts`).pipe(
								HttpClientRequest.setUrlParam("language", language),
							),
						),
						Schema.Array(CodeContext),
					)
					.pipe(Effect.mapError((e) => new CodeContextError({ message: String(e) })));

			const getCodeContext: ExecdClient["getCodeContext"] = (contextId) =>
				http
					.json(
						withJson(HttpClientRequest.get(`${conn.baseUrl}/code/contexts/${contextId}`)),
						CodeContext,
					)
					.pipe(Effect.mapError((e) => new CodeContextError({ contextId, message: String(e) })));

			const deleteCodeContext: ExecdClient["deleteCodeContext"] = (contextId) =>
				http
					.void(withAuth(HttpClientRequest.del(`${conn.baseUrl}/code/contexts/${contextId}`)))
					.pipe(Effect.mapError((e) => new CodeContextError({ contextId, message: String(e) })));

			const deleteCodeContexts: ExecdClient["deleteCodeContexts"] = (language) =>
				http
					.void(
						withAuth(
							HttpClientRequest.del(`${conn.baseUrl}/code/contexts`).pipe(
								HttpClientRequest.setUrlParam("language", language),
							),
						),
					)
					.pipe(Effect.mapError((e) => new CodeContextError({ message: String(e) })));

			const executeCode: ExecdClient["executeCode"] = (code, context) =>
				sseStream(
					HttpClientRequest.post(`${conn.baseUrl}/code`).pipe(
						HttpClientRequest.bodyUnsafeJson({ code, context }),
					),
				).pipe(Stream.mapError((e) => new CodeContextError({ message: String(e) })));

			const interruptCode: ExecdClient["interruptCode"] = (id) =>
				http
					.void(
						withAuth(
							HttpClientRequest.del(`${conn.baseUrl}/code`).pipe(
								HttpClientRequest.setUrlParam("id", id),
							),
						),
					)
					.pipe(Effect.mapError((e) => new CodeContextError({ message: String(e) })));

			const readFile: ExecdClient["readFile"] = (path) =>
				Effect.gen(function* () {
					const url = `${conn.baseUrl}/files/download?path=${encodeURIComponent(path)}`;
					const response = yield* httpClient.execute(withAuth(HttpClientRequest.get(url)));
					return yield* response.arrayBuffer.pipe(Effect.map((buf) => new Uint8Array(buf)));
				}).pipe(
					Effect.scoped,
					Effect.mapError((e) => new FileReadError({ path, message: String(e) })),
				);

			const readTextFile: ExecdClient["readTextFile"] = (path) =>
				readFile(path).pipe(
					Effect.map((bytes) => new TextDecoder().decode(bytes)),
					Effect.mapError((e) =>
						e._tag === "SandboxNetworkError" ? e : new FileReadError({ path, message: e.message }),
					),
				);

			const writeFile: ExecdClient["writeFile"] = (path, content) =>
				Effect.gen(function* () {
					const form = new FormData();
					form.append("metadata", JSON.stringify({ path }));
					form.append("file", new Blob([typeof content === "string" ? content : content]));
					const req = HttpClientRequest.post(`${conn.baseUrl}/files/upload`).pipe(
						HttpClientRequest.setHeader("X-EXECD-ACCESS-TOKEN", conn.accessToken),
						HttpClientRequest.bodyFormData(form),
					);
					yield* httpClient.execute(req);
				}).pipe(
					Effect.scoped,
					Effect.asVoid,
					Effect.mapError((e) => new FileWriteError({ path, message: String(e) })),
				);

			const fileInfo: ExecdClient["fileInfo"] = (paths) => {
				const query = paths.map((p) => `path=${encodeURIComponent(p)}`).join("&");
				const url = `${conn.baseUrl}/files/info?${query}`;
				return http
					.json(
						withJson(HttpClientRequest.get(url)),
						Schema.Record({ key: Schema.String, value: FileInfo }),
					)
					.pipe(
						Effect.mapError((e) => new SandboxHttpError({ url, statusCode: 0, body: String(e) })),
					);
			};

			const deleteFiles: ExecdClient["deleteFiles"] = (paths) => {
				const query = paths.map((p) => `path=${encodeURIComponent(p)}`).join("&");
				const url = `${conn.baseUrl}/files?${query}`;
				return http
					.void(withAuth(HttpClientRequest.del(url)))
					.pipe(
						Effect.mapError((e) => new SandboxHttpError({ url, statusCode: 0, body: String(e) })),
					);
			};

			const moveFiles: ExecdClient["moveFiles"] = (entries) =>
				http
					.void(
						withAuth(
							HttpClientRequest.post(`${conn.baseUrl}/files/mv`).pipe(
								HttpClientRequest.bodyUnsafeJson(entries),
							),
						),
					)
					.pipe(
						Effect.mapError(
							(e) =>
								new SandboxHttpError({
									url: `${conn.baseUrl}/files/mv`,
									statusCode: 0,
									body: String(e),
								}),
						),
					);

			const searchFiles: ExecdClient["searchFiles"] = (path, pattern) => {
				const query = new URLSearchParams({ path });
				if (pattern) query.set("pattern", pattern);
				const url = `${conn.baseUrl}/files/search?${query}`;
				return http
					.json(withJson(HttpClientRequest.get(url)), Schema.Array(FileInfo))
					.pipe(
						Effect.mapError((e) => new SandboxHttpError({ url, statusCode: 0, body: String(e) })),
					);
			};

			const replaceInFiles: ExecdClient["replaceInFiles"] = (replacements) =>
				http
					.void(
						withAuth(
							HttpClientRequest.post(`${conn.baseUrl}/files/replace`).pipe(
								HttpClientRequest.bodyUnsafeJson(replacements),
							),
						),
					)
					.pipe(
						Effect.mapError(
							(e) =>
								new SandboxHttpError({
									url: `${conn.baseUrl}/files/replace`,
									statusCode: 0,
									body: String(e),
								}),
						),
					);

			const setPermissions: ExecdClient["setPermissions"] = (perms) =>
				http
					.void(
						withAuth(
							HttpClientRequest.post(`${conn.baseUrl}/files/permissions`).pipe(
								HttpClientRequest.bodyUnsafeJson(perms),
							),
						),
					)
					.pipe(Effect.mapError((e) => new FilePermissionError({ path: "", message: String(e) })));

			const createDirectories: ExecdClient["createDirectories"] = (dirs) => {
				const body: Record<string, Record<string, unknown>> = {};
				if (Array.isArray(dirs)) {
					for (const d of dirs) body[d] = {};
				} else {
					Object.assign(body, dirs);
				}
				return http
					.void(
						withAuth(
							HttpClientRequest.post(`${conn.baseUrl}/directories`).pipe(
								HttpClientRequest.bodyUnsafeJson(body),
							),
						),
					)
					.pipe(
						Effect.mapError(
							(e) =>
								new DirectoryCreateError({
									paths: Array.isArray(dirs) ? dirs : Object.keys(dirs),
									message: String(e),
								}),
						),
					);
			};

			const deleteDirectories: ExecdClient["deleteDirectories"] = (paths) => {
				const query = paths.map((p) => `path=${encodeURIComponent(p)}`).join("&");
				const url = `${conn.baseUrl}/directories?${query}`;
				return http
					.void(withAuth(HttpClientRequest.del(url)))
					.pipe(
						Effect.mapError((e) => new SandboxHttpError({ url, statusCode: 0, body: String(e) })),
					);
			};

			const metrics: ExecdClient["metrics"] = () =>
				http.json(withJson(HttpClientRequest.get(`${conn.baseUrl}/metrics`)), SystemMetrics).pipe(
					Effect.mapError(
						(e) =>
							new SandboxHttpError({
								url: `${conn.baseUrl}/metrics`,
								statusCode: 0,
								body: String(e),
							}),
					),
				);

			const watchMetrics: ExecdClient["watchMetrics"] = () =>
				HttpClientResponse.stream(
					httpClient.execute(withAuth(HttpClientRequest.get(`${conn.baseUrl}/metrics/watch`))).pipe(
						Effect.tap((response) => {
							if (response.status >= 400)
								return Effect.fail(
									new SandboxHttpError({
										url: `${conn.baseUrl}/metrics/watch`,
										statusCode: response.status,
										body: "",
									}),
								);
							return Effect.void;
						}),
					),
				).pipe(
					Stream.decodeText(),
					parseExecdSSE,
					Stream.mapEffect((frame) =>
						Schema.decodeUnknown(SystemMetrics)(frame.data).pipe(Effect.orDie),
					),
					Stream.mapError((e): SandboxHttpError | SandboxNetworkError =>
						e instanceof SandboxHttpError
							? e
							: new SandboxHttpError({
									url: `${conn.baseUrl}/metrics/watch`,
									statusCode: 0,
									body: String(e),
								}),
					),
				);

			return {
				ping,
				exec,
				execStream,
				execBackground,
				commandStatus,
				commandLogs,
				killCommand,
				createSession,
				sessionExec,
				deleteSession,
				createCodeContext,
				listCodeContexts,
				getCodeContext,
				deleteCodeContext,
				deleteCodeContexts,
				executeCode,
				interruptCode,
				readFile,
				readTextFile,
				writeFile,
				fileInfo,
				deleteFiles,
				moveFiles,
				searchFiles,
				replaceInFiles,
				setPermissions,
				createDirectories,
				deleteDirectories,
				metrics,
				watchMetrics,
			};
		};

		return { connect };
	}),
	dependencies: [FetchHttpClient.layer],
}) {}
