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

export const TokenUsage = Schema.Struct({
	input: Schema.Int,
	output: Schema.Int,
	cacheRead: Schema.optional(Schema.Int),
	cacheWrite: Schema.optional(Schema.Int),
	reasoning: Schema.optional(Schema.Int),
	total: Schema.optional(Schema.Int),
});
export type TokenUsage = typeof TokenUsage.Type;

export const CostUsage = Schema.Struct({
	input: Schema.Number,
	output: Schema.Number,
	reasoning: Schema.optional(Schema.Number),
	cacheRead: Schema.optional(Schema.Number),
	cacheWrite: Schema.optional(Schema.Number),
});
export type CostUsage = typeof CostUsage.Type;

export const Usage = Schema.Struct({
	token: TokenUsage,
	cost: Schema.optional(CostUsage),
});
export type Usage = typeof Usage.Type;
