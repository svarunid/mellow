import { Schema } from "effect";
import { Delta, ErrorDelta } from "./delta";
import { AssistantContentBlock } from "./message";
import { StopReason, TokenUsage } from "./metadata";

export const StreamStart = Schema.Struct({
	type: Schema.Literal("response.start"),
});
export type StreamStart = typeof StreamStart.Type;

export const StreamContentStart = Schema.Struct({
	type: Schema.Literal("content.start"),
	index: Schema.Int,
	contentBlock: Schema.optional(AssistantContentBlock),
});
export type StreamContentStart = typeof StreamContentStart.Type;

export const StreamContentDelta = Schema.Struct({
	type: Schema.Literal("content.delta"),
	index: Schema.Int,
	delta: Delta,
});
export type StreamContentDelta = typeof StreamContentDelta.Type;

export const StreamContentStop = Schema.Struct({
	type: Schema.Literal("content.stop"),
	index: Schema.Int,
});
export type StreamContentStop = typeof StreamContentStop.Type;

export const StreamComplete = Schema.Struct({
	type: Schema.Literal("response.complete"),
	stopReason: Schema.optional(StopReason),
	usage: Schema.optional(TokenUsage),
});
export type StreamComplete = typeof StreamComplete.Type;

export const StreamError = Schema.Struct({
	type: Schema.Literal("error"),
	error: ErrorDelta,
});
export type StreamError = typeof StreamError.Type;

export const StreamEvent = Schema.Union(
	StreamStart,
	StreamContentStart,
	StreamContentDelta,
	StreamContentStop,
	StreamComplete,
	StreamError,
);
export type StreamEvent = typeof StreamEvent.Type;
