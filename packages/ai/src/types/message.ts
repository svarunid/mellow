import { Schema } from "effect";
import { AudioContent, DocumentContent, ImageContent, TextContent, VideoContent } from "./content";
import { CompactionBlock, ReasoningBlock, RedactedReasoningBlock } from "./reasoning";
import {
	ServerToolCallBlock,
	ServerToolResultBlock,
	ShellCallBlock,
	ShellResultBlock,
	ToolCallBlock,
	ToolResultBlock,
} from "./tool";

export const UserContentBlock = Schema.Union(
	TextContent,
	ImageContent,
	AudioContent,
	DocumentContent,
	VideoContent,
	ToolResultBlock,
	ServerToolResultBlock,
	ShellResultBlock,
);
export type UserContentBlock = typeof UserContentBlock.Type;

export const AssistantContentBlock = Schema.Union(
	TextContent,
	ToolCallBlock,
	ServerToolCallBlock,
	ReasoningBlock,
	RedactedReasoningBlock,
	CompactionBlock,
	ShellCallBlock,
);
export type AssistantContentBlock = typeof AssistantContentBlock.Type;

export const SystemMessage = Schema.Struct({
	role: Schema.Literal("system"),
	content: Schema.String,
});
export type SystemMessage = typeof SystemMessage.Type;

export const UserMessage = Schema.Struct({
	role: Schema.Literal("user"),
	content: Schema.Union(Schema.String, Schema.Array(UserContentBlock)),
});
export type UserMessage = typeof UserMessage.Type;

export const AssistantMessage = Schema.Struct({
	role: Schema.Literal("assistant"),
	content: Schema.Array(AssistantContentBlock),
});
export type AssistantMessage = typeof AssistantMessage.Type;

export const Message = Schema.Union(SystemMessage, UserMessage, AssistantMessage);
export type Message = typeof Message.Type;
