import { Schema } from "effect";

export const ReasoningBlock = Schema.Struct({
	type: Schema.Literal("reasoning"),
	text: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type ReasoningBlock = typeof ReasoningBlock.Type;

export const RedactedReasoningBlock = Schema.Struct({
	type: Schema.Literal("redacted_reasoning"),
	data: Schema.String,
});
export type RedactedReasoningBlock = typeof RedactedReasoningBlock.Type;

export const CompactionBlock = Schema.Struct({
	type: Schema.Literal("compaction"),
	summary: Schema.String,
});
export type CompactionBlock = typeof CompactionBlock.Type;
