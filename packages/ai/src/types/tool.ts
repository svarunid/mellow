import { Schema } from "effect";
import { ContentBlock } from "./content";

export const FunctionTool = Schema.Struct({
	type: Schema.Literal("function"),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	parameters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	strict: Schema.optional(Schema.Boolean),
	deferLoading: Schema.optional(Schema.Boolean),
});
export type FunctionTool = typeof FunctionTool.Type;

export const WebSearchTool = Schema.Struct({
	type: Schema.Literal("web_search"),
	maxUses: Schema.optional(Schema.Int),
	allowedDomains: Schema.optional(Schema.Array(Schema.String)),
	blockedDomains: Schema.optional(Schema.Array(Schema.String)),
	userLocation: Schema.optional(
		Schema.Struct({
			city: Schema.optional(Schema.String),
			region: Schema.optional(Schema.String),
			country: Schema.optional(Schema.String),
			timezone: Schema.optional(Schema.String),
		}),
	),
});
export type WebSearchTool = typeof WebSearchTool.Type;

export const CodeExecutionTool = Schema.Struct({
	type: Schema.Literal("code_execution"),
});
export type CodeExecutionTool = typeof CodeExecutionTool.Type;

export const ComputerUseTool = Schema.Struct({
	type: Schema.Literal("computer_use"),
	displayWidth: Schema.optional(Schema.Int),
	displayHeight: Schema.optional(Schema.Int),
	environment: Schema.optional(Schema.String),
});
export type ComputerUseTool = typeof ComputerUseTool.Type;

export const FileSearchTool = Schema.Struct({
	type: Schema.Literal("file_search"),
	storeIds: Schema.optional(Schema.Array(Schema.String)),
	maxResults: Schema.optional(Schema.Int),
});
export type FileSearchTool = typeof FileSearchTool.Type;

export const McpTool = Schema.Struct({
	type: Schema.Literal("mcp"),
	name: Schema.String,
	url: Schema.String,
	headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
	allowedTools: Schema.optional(Schema.Array(Schema.String)),
});
export type McpTool = typeof McpTool.Type;

export const Tool = Schema.Union(
	FunctionTool,
	WebSearchTool,
	CodeExecutionTool,
	ComputerUseTool,
	FileSearchTool,
	McpTool,
);
export type Tool = typeof Tool.Type;

export const ToolCallBlock = Schema.Struct({
	type: Schema.Literal("tool_call"),
	callId: Schema.String,
	name: Schema.String,
	input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
export type ToolCallBlock = typeof ToolCallBlock.Type;

export const ToolResultBlock = Schema.Struct({
	type: Schema.Literal("tool_result"),
	callId: Schema.String,
	output: Schema.Union(Schema.String, Schema.Array(ContentBlock)),
	isError: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});
export type ToolResultBlock = typeof ToolResultBlock.Type;

export const ServerToolCallBlock = Schema.Struct({
	type: Schema.Literal("server_tool_call"),
	callId: Schema.String,
	name: Schema.String,
	input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
export type ServerToolCallBlock = typeof ServerToolCallBlock.Type;

export const ServerToolResultBlock = Schema.Struct({
	type: Schema.Literal("server_tool_result"),
	callId: Schema.String,
	content: Schema.Unknown,
});
export type ServerToolResultBlock = typeof ServerToolResultBlock.Type;

export const ShellCallBlock = Schema.Struct({
	type: Schema.Literal("shell_call"),
	callId: Schema.String,
	commands: Schema.Array(Schema.String),
	restart: Schema.optional(Schema.Boolean),
	timeoutMs: Schema.optional(Schema.Int),
	env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
	workingDirectory: Schema.optional(Schema.String),
	maxOutputLength: Schema.optional(Schema.Int),
});
export type ShellCallBlock = typeof ShellCallBlock.Type;

export const ShellResultBlock = Schema.Struct({
	type: Schema.Literal("shell_result"),
	callId: Schema.String,
	stdout: Schema.String,
	stderr: Schema.String,
	exitCode: Schema.Int,
	timedOut: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});
export type ShellResultBlock = typeof ShellResultBlock.Type;

export const AutoToolChoice = Schema.Struct({
	type: Schema.Literal("auto"),
});
export type AutoToolChoice = typeof AutoToolChoice.Type;

export const AnyToolChoice = Schema.Struct({
	type: Schema.Literal("any"),
});
export type AnyToolChoice = typeof AnyToolChoice.Type;

export const NoneToolChoice = Schema.Struct({
	type: Schema.Literal("none"),
});
export type NoneToolChoice = typeof NoneToolChoice.Type;

export const NamedToolChoice = Schema.Struct({
	type: Schema.Literal("tool"),
	name: Schema.String,
});
export type NamedToolChoice = typeof NamedToolChoice.Type;

export const ToolChoice = Schema.Union(
	AutoToolChoice,
	AnyToolChoice,
	NoneToolChoice,
	NamedToolChoice,
);
export type ToolChoice = typeof ToolChoice.Type;
