import { Schema } from "effect";

export class SandboxStatus extends Schema.Class<SandboxStatus>("SandboxStatus")({
	state: Schema.String,
	reason: Schema.optional(Schema.String),
	message: Schema.optional(Schema.String),
	lastTransitionAt: Schema.optional(Schema.String),
}) {}

export class SandboxInfo extends Schema.Class<SandboxInfo>("SandboxInfo")({
	id: Schema.String,
	status: SandboxStatus,
	metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
	expiresAt: Schema.optional(Schema.String),
	createdAt: Schema.String,
	entrypoint: Schema.Array(Schema.String),
}) {}

const Pagination = Schema.Struct({
	page: Schema.Number,
	pageSize: Schema.Number,
	totalItems: Schema.Number,
	totalPages: Schema.Number,
	hasNextPage: Schema.Boolean,
});

export class SandboxList extends Schema.Class<SandboxList>("SandboxList")({
	items: Schema.Array(SandboxInfo),
	pagination: Pagination,
}) {}

export class EndpointInfo extends Schema.Class<EndpointInfo>("EndpointInfo")({
	endpoint: Schema.String,
	headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
}) {}

export class RenewResponse extends Schema.Class<RenewResponse>("RenewResponse")({
	expiresAt: Schema.String,
}) {}

export class ExecEvent extends Schema.Class<ExecEvent>("ExecEvent")({
	type: Schema.String,
	text: Schema.optional(Schema.String),
	exit_code: Schema.optional(Schema.Number),
	execution_time: Schema.optional(Schema.Number),
	execution_count: Schema.optional(Schema.Number),
	timestamp: Schema.optional(Schema.Number),
	results: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	error: Schema.optional(
		Schema.Struct({
			ename: Schema.String,
			evalue: Schema.String,
			traceback: Schema.Array(Schema.String),
		}),
	),
}) {}

export class CommandStatusResponse extends Schema.Class<CommandStatusResponse>(
	"CommandStatusResponse",
)({
	id: Schema.String,
	content: Schema.String,
	running: Schema.Boolean,
	exit_code: Schema.NullOr(Schema.Number),
	error: Schema.optional(Schema.String),
	started_at: Schema.String,
	finished_at: Schema.NullOr(Schema.String),
}) {}

export class FileInfo extends Schema.Class<FileInfo>("FileInfo")({
	path: Schema.String,
	size: Schema.Number,
	modified_at: Schema.String,
	created_at: Schema.String,
	owner: Schema.String,
	group: Schema.String,
	mode: Schema.Number,
}) {}

export class SystemMetrics extends Schema.Class<SystemMetrics>("SystemMetrics")({
	cpu_count: Schema.Number,
	cpu_used_pct: Schema.Number,
	mem_total_mib: Schema.Number,
	mem_used_mib: Schema.Number,
	timestamp: Schema.Number,
}) {}

export class CodeContext extends Schema.Class<CodeContext>("CodeContext")({
	id: Schema.String,
	language: Schema.String,
}) {}

export class SessionResponse extends Schema.Class<SessionResponse>("SessionResponse")({
	session_id: Schema.String,
}) {}
