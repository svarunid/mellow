import { Schema } from "effect";

export const TextDelta = Schema.Struct({
	type: Schema.Literal("text_delta"),
	text: Schema.String,
});
export type TextDelta = typeof TextDelta.Type;

export const ReasoningDelta = Schema.Struct({
	type: Schema.Literal("reasoning_delta"),
	text: Schema.String,
});
export type ReasoningDelta = typeof ReasoningDelta.Type;

export const ToolCallArgsDelta = Schema.Struct({
	type: Schema.Literal("tool_call_args_delta"),
	callId: Schema.String,
	argsDelta: Schema.String,
});
export type ToolCallArgsDelta = typeof ToolCallArgsDelta.Type;

export const ToolCallEnd = Schema.Struct({
	type: Schema.Literal("tool_call_end"),
	callId: Schema.String,
	name: Schema.String,
	input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});
export type ToolCallEnd = typeof ToolCallEnd.Type;

export const SignatureDelta = Schema.Struct({
	type: Schema.Literal("signature_delta"),
	signature: Schema.String,
});
export type SignatureDelta = typeof SignatureDelta.Type;

export const CompactionDelta = Schema.Struct({
	type: Schema.Literal("compaction_delta"),
	summary: Schema.String,
});
export type CompactionDelta = typeof CompactionDelta.Type;

export const ErrorDelta = Schema.Struct({
	type: Schema.Literal("error"),
	code: Schema.optional(Schema.String),
	message: Schema.String,
});
export type ErrorDelta = typeof ErrorDelta.Type;

export const Delta = Schema.Union(
	TextDelta,
	ReasoningDelta,
	ToolCallArgsDelta,
	ToolCallEnd,
	SignatureDelta,
	CompactionDelta,
	ErrorDelta,
);
export type Delta = typeof Delta.Type;
