import { Context, type Effect, type Schema, type Stream } from "effect";
import type { AssistantContentBlock } from "../../types/message";
import type { Message } from "../../types/message";
import type { StopReason, Usage } from "../../types/metadata";
import type { StreamEvent } from "../../types/stream";
import type { ContextManagement, ThinkingConfig } from "../../types/config";
import type { Tool, ToolChoice } from "../../types/tool";
import type { LLMError } from "../../errors";

export interface BaseParams {
	readonly model: string;
	readonly messages: Message[];
	readonly maxTokens?: number | undefined;
	readonly tools?: Tool[] | undefined;
	readonly toolChoice?: ToolChoice | undefined;
	readonly thinking?: ThinkingConfig | undefined;
	readonly contextManagement?: ContextManagement | undefined;
	readonly temperature?: number | undefined;
	readonly topP?: number | undefined;
	readonly topK?: number | undefined;
	readonly stopSequences?: string[] | undefined;
}

export interface GenerateTextParams extends BaseParams {}

export interface GenerateTextResult {
	readonly content: AssistantContentBlock[];
	readonly stopReason: StopReason;
	readonly usage: Usage;
}

export interface GenerateObjectParams<T> extends BaseParams {
	readonly schema: Schema.Schema<T, unknown>;
	readonly name?: string | undefined;
	readonly strict?: boolean | undefined;
}

export interface GenerateObjectResult<T> {
	readonly object: T;
	readonly usage: Usage;
}

export interface StreamParams extends BaseParams {}

export class LLM extends Context.Tag("@mellow/LLM")<
	LLM,
	{
		readonly generateText: (
			params: GenerateTextParams,
		) => Effect.Effect<GenerateTextResult, LLMError>;
		readonly generateObject: <T>(
			params: GenerateObjectParams<T>,
		) => Effect.Effect<GenerateObjectResult<T>, LLMError>;
		readonly stream: (
			params: StreamParams,
		) => Effect.Effect<Stream.Stream<StreamEvent, LLMError>, LLMError>;
	}
>() {}
