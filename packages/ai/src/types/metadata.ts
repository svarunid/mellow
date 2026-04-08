import { Schema } from "effect";

export const EndTurnStopReason = Schema.Literal("end_turn");
export const StopSequenceStopReason = Schema.Literal("stop_sequence");
export const ToolUseStopReason = Schema.Literal("tool_use");

export const StopReason = Schema.Union(
	EndTurnStopReason,
	StopSequenceStopReason,
	ToolUseStopReason,
);
export type StopReason = typeof StopReason.Type;

export const Usage = Schema.Struct({
	inputTokens: Schema.Int,
	outputTokens: Schema.Int,
	cacheReadTokens: Schema.optional(Schema.Int),
	cacheWriteTokens: Schema.optional(Schema.Int),
	reasoningTokens: Schema.optional(Schema.Int),
	totalTokens: Schema.optional(Schema.Int),
});
export type Usage = typeof Usage.Type;
