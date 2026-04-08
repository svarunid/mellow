import { Data } from "effect";

export class SandboxProvisionError extends Data.TaggedError("SandboxProvisionError")<{
	readonly sandboxId?: string;
	readonly message: string;
}> {}

export class SandboxNotFoundError extends Data.TaggedError("SandboxNotFoundError")<{
	readonly sandboxId: string;
}> {}

export class SandboxStateConflictError extends Data.TaggedError("SandboxStateConflictError")<{
	readonly sandboxId: string;
	readonly message: string;
}> {}

export class EndpointResolveError extends Data.TaggedError("EndpointResolveError")<{
	readonly sandboxId: string;
	readonly port: number;
	readonly message: string;
}> {}

export class CommandTimeoutError extends Data.TaggedError("CommandTimeoutError")<{
	readonly command: string;
	readonly timeoutSeconds: number;
}> {}

export class CommandStreamError extends Data.TaggedError("CommandStreamError")<{
	readonly message: string;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
	readonly path: string;
	readonly message: string;
}> {}

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
	readonly path: string;
	readonly message: string;
}> {}

export class FilePermissionError extends Data.TaggedError("FilePermissionError")<{
	readonly path: string;
	readonly message: string;
}> {}

export class DirectoryCreateError extends Data.TaggedError("DirectoryCreateError")<{
	readonly paths: readonly string[];
	readonly message: string;
}> {}

export class SessionError extends Data.TaggedError("SessionError")<{
	readonly sessionId: string;
	readonly message: string;
}> {}

export class CodeContextError extends Data.TaggedError("CodeContextError")<{
	readonly contextId?: string;
	readonly message: string;
}> {}

export class DiagnosticsError extends Data.TaggedError("DiagnosticsError")<{
	readonly sandboxId: string;
	readonly message: string;
}> {}

export class SandboxHttpError extends Data.TaggedError("SandboxHttpError")<{
	readonly url: string;
	readonly statusCode: number;
	readonly body: string;
}> {}

export class SandboxNetworkError extends Data.TaggedError("SandboxNetworkError")<{
	readonly url: string;
	readonly message: string;
}> {}

export type LifecycleError =
	| SandboxProvisionError
	| SandboxNotFoundError
	| SandboxStateConflictError
	| EndpointResolveError
	| DiagnosticsError
	| SandboxHttpError
	| SandboxNetworkError;

export type ExecdError =
	| CommandTimeoutError
	| CommandStreamError
	| SessionError
	| CodeContextError
	| FileReadError
	| FileWriteError
	| FilePermissionError
	| DirectoryCreateError
	| SandboxHttpError
	| SandboxNetworkError;

export type SandboxError = LifecycleError | ExecdError;
