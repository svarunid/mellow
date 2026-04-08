import { Schema } from "effect";

export const ThinkingEnabled = Schema.Struct({
	type: Schema.Literal("enabled"),
	budgetTokens: Schema.optional(Schema.Int),
	display: Schema.optional(Schema.Literal("summarized", "omitted")),
});
export type ThinkingEnabled = typeof ThinkingEnabled.Type;

export const ThinkingDisabled = Schema.Struct({
	type: Schema.Literal("disabled"),
});
export type ThinkingDisabled = typeof ThinkingDisabled.Type;

export const ThinkingAdaptive = Schema.Struct({
	type: Schema.Literal("adaptive"),
	display: Schema.optional(Schema.Literal("summarized", "omitted")),
});
export type ThinkingAdaptive = typeof ThinkingAdaptive.Type;

export const ThinkingConfig = Schema.Union(ThinkingEnabled, ThinkingDisabled, ThinkingAdaptive);
export type ThinkingConfig = typeof ThinkingConfig.Type;

export const TextOutputFormat = Schema.Struct({
	type: Schema.Literal("text"),
});
export type TextOutputFormat = typeof TextOutputFormat.Type;

export const JsonObjectOutputFormat = Schema.Struct({
	type: Schema.Literal("json_object"),
});
export type JsonObjectOutputFormat = typeof JsonObjectOutputFormat.Type;

export const JsonSchemaOutputFormat = Schema.Struct({
	type: Schema.Literal("json_schema"),
	name: Schema.optional(Schema.String),
	schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	strict: Schema.optional(Schema.Boolean),
});
export type JsonSchemaOutputFormat = typeof JsonSchemaOutputFormat.Type;

export const OutputFormat = Schema.Union(
	TextOutputFormat,
	JsonObjectOutputFormat,
	JsonSchemaOutputFormat,
);
export type OutputFormat = typeof OutputFormat.Type;

export const ContextManagement = Schema.Struct({
	compaction: Schema.optional(
		Schema.Struct({
			enabled: Schema.Boolean,
			threshold: Schema.optional(Schema.Int),
			instructions: Schema.optional(Schema.String),
		}),
	),
	truncation: Schema.optional(
		Schema.Struct({
			enabled: Schema.Boolean,
			maxTokens: Schema.optional(Schema.Int),
		}),
	),
});
export type ContextManagement = typeof ContextManagement.Type;
