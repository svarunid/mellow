import { Config, Context, Effect, Layer } from "effect";
import type {
	DiagnosticsError,
	EndpointResolveError,
	SandboxNetworkError,
	SandboxNotFoundError,
	SandboxStateConflictError,
} from "./errors";
import { type ExecdClient, type ExecdConnection, SandboxExecd } from "./execd";
import type { RenewResponse } from "./schemas";
import { SandboxServer } from "./server";

export type {
	CodeContextError,
	CommandStreamError,
	CommandTimeoutError,
	DiagnosticsError,
	DirectoryCreateError,
	EndpointResolveError,
	FilePermissionError,
	FileReadError,
	FileWriteError,
	SandboxError,
	SandboxHttpError,
	SandboxNetworkError,
	SandboxNotFoundError,
	SandboxProvisionError,
	SandboxStateConflictError,
	SessionError,
} from "./errors";
export type { CommandLogs, ExecdClient, ExecdConnection, ExecOptions } from "./execd";
export { SandboxExecd } from "./execd";
export type {
	CodeContext,
	CommandStatusResponse,
	EndpointInfo,
	FileInfo,
	RenewResponse,
	SandboxInfo,
	SandboxList,
	SandboxStatus,
	SessionResponse,
	SystemMetrics,
} from "./schemas";
export { SandboxServer } from "./server";
export type { ExecResult, SSEFrame } from "./sse";

export interface SandboxCommands {
	readonly exec: ExecdClient["exec"];
	readonly execStream: ExecdClient["execStream"];
	readonly execBackground: ExecdClient["execBackground"];
	readonly status: ExecdClient["commandStatus"];
	readonly logs: ExecdClient["commandLogs"];
	readonly kill: ExecdClient["killCommand"];
}

export interface SandboxFiles {
	readonly read: ExecdClient["readFile"];
	readonly readText: ExecdClient["readTextFile"];
	readonly write: ExecdClient["writeFile"];
	readonly info: ExecdClient["fileInfo"];
	readonly delete: ExecdClient["deleteFiles"];
	readonly move: ExecdClient["moveFiles"];
	readonly search: ExecdClient["searchFiles"];
	readonly replace: ExecdClient["replaceInFiles"];
	readonly setPermissions: ExecdClient["setPermissions"];
}

export interface SandboxDirectories {
	readonly create: ExecdClient["createDirectories"];
	readonly delete: ExecdClient["deleteDirectories"];
}

export interface SandboxSessions {
	readonly create: ExecdClient["createSession"];
	readonly exec: ExecdClient["sessionExec"];
	readonly delete: ExecdClient["deleteSession"];
}

export interface SandboxCode {
	readonly createContext: ExecdClient["createCodeContext"];
	readonly listContexts: ExecdClient["listCodeContexts"];
	readonly getContext: ExecdClient["getCodeContext"];
	readonly deleteContext: ExecdClient["deleteCodeContext"];
	readonly deleteContexts: ExecdClient["deleteCodeContexts"];
	readonly execute: ExecdClient["executeCode"];
	readonly interrupt: ExecdClient["interruptCode"];
}

export interface SandboxMetrics {
	readonly get: ExecdClient["metrics"];
	readonly watch: ExecdClient["watchMetrics"];
}

export interface SandboxHealth {
	readonly ping: ExecdClient["ping"];
}

export interface SandboxLifecycle {
	readonly pause: () => Effect.Effect<
		void,
		SandboxNotFoundError | SandboxStateConflictError | SandboxNetworkError
	>;
	readonly resume: () => Effect.Effect<
		void,
		SandboxNotFoundError | SandboxStateConflictError | SandboxNetworkError
	>;
	readonly destroy: () => Effect.Effect<void, SandboxNotFoundError | SandboxNetworkError>;
	readonly renewExpiration: (
		expiresAt: Date,
	) => Effect.Effect<RenewResponse, SandboxNotFoundError | SandboxNetworkError>;
	readonly logs: (opts?: {
		readonly tail?: number;
		readonly since?: string;
	}) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly inspect: () => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly events: (opts?: {
		readonly limit?: number;
	}) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly summary: (opts?: {
		readonly tail?: number;
		readonly eventLimit?: number;
	}) => Effect.Effect<string, DiagnosticsError | SandboxNetworkError>;
	readonly getPreviewUrl: (
		port: number,
	) => Effect.Effect<string, EndpointResolveError | SandboxNetworkError>;
}

export interface SandboxService {
	readonly id: string;
	readonly commands: SandboxCommands;
	readonly files: SandboxFiles;
	readonly directories: SandboxDirectories;
	readonly sessions: SandboxSessions;
	readonly code: SandboxCode;
	readonly metrics: SandboxMetrics;
	readonly health: SandboxHealth;
	readonly lifecycle: SandboxLifecycle;
}

const EXECD_PORT = 44772;

export class Sandbox extends Context.Tag("@mellow/sandbox/Sandbox")<Sandbox, SandboxService>() {
	static make(ref: { sandboxId: string } | { projectId: string }) {
		return Layer.scoped(
			Sandbox,
			Effect.acquireRelease(
				Effect.gen(function* () {
					const server = yield* SandboxServer;
					const execd = yield* SandboxExecd;
					const sandboxImage = yield* Config.string("SANDBOX_IMAGE").pipe(
						Config.withDefault("mellow/sandbox:latest"),
					);

					let sandboxId: string;
					if ("sandboxId" in ref) {
						sandboxId = ref.sandboxId;
						yield* server
							.resume(sandboxId)
							.pipe(Effect.catchTag("SandboxStateConflictError", () => Effect.void));
					} else {
						const created = yield* server.create({
							image: sandboxImage,
							timeoutSeconds: null,
							env: { PROJECT_ID: ref.projectId },
							resourceLimits: { cpu: "2", memory: "4Gi" },
						});
						sandboxId = created.id;
					}

					const endpointInfo = yield* server.getEndpoint(sandboxId, EXECD_PORT);
					const conn: ExecdConnection = {
						baseUrl: `http://${endpointInfo.endpoint}`,
						accessToken:
							endpointInfo.headers?.["X-EXECD-ACCESS-TOKEN"] ??
							endpointInfo.headers?.["x-execd-access-token"] ??
							"",
					};
					const client = execd.connect(conn);

					const service: SandboxService = {
						id: sandboxId,
						commands: {
							exec: client.exec,
							execStream: client.execStream,
							execBackground: client.execBackground,
							status: client.commandStatus,
							logs: client.commandLogs,
							kill: client.killCommand,
						},
						files: {
							read: client.readFile,
							readText: client.readTextFile,
							write: client.writeFile,
							info: client.fileInfo,
							delete: client.deleteFiles,
							move: client.moveFiles,
							search: client.searchFiles,
							replace: client.replaceInFiles,
							setPermissions: client.setPermissions,
						},
						directories: {
							create: client.createDirectories,
							delete: client.deleteDirectories,
						},
						sessions: {
							create: client.createSession,
							exec: client.sessionExec,
							delete: client.deleteSession,
						},
						code: {
							createContext: client.createCodeContext,
							listContexts: client.listCodeContexts,
							getContext: client.getCodeContext,
							deleteContext: client.deleteCodeContext,
							deleteContexts: client.deleteCodeContexts,
							execute: client.executeCode,
							interrupt: client.interruptCode,
						},
						metrics: {
							get: client.metrics,
							watch: client.watchMetrics,
						},
						health: {
							ping: client.ping,
						},
						lifecycle: {
							pause: () => server.pause(sandboxId),
							resume: () => server.resume(sandboxId),
							destroy: () => server.destroy(sandboxId),
							renewExpiration: (expiresAt) => server.renewExpiration(sandboxId, expiresAt),
							logs: (opts) => server.logs(sandboxId, opts),
							inspect: () => server.inspect(sandboxId),
							events: (opts) => server.events(sandboxId, opts),
							summary: (opts) => server.summary(sandboxId, opts),
							getPreviewUrl: (port) =>
								server
									.getEndpoint(sandboxId, port)
									.pipe(Effect.map((info) => `http://${info.endpoint}`)),
						},
					};

					return service;
				}),
				(service) => {
					return Effect.gen(function* () {
						const server = yield* SandboxServer;
						yield* server.pause(service.id).pipe(Effect.ignore);
					}).pipe(Effect.orDie);
				},
			),
		);
	}
}
