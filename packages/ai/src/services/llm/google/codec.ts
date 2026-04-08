import { Either, Schema } from "effect";
import {
	type GeminiContent,
	type GeminiInteractionStatus,
	GeminiStreamEvent,
	type GeminiUsage,
} from "./types";
import type {
	GeminiAnnotation,
	GeminiGenerationConfig,
	GeminiInteractionsCreateRequest,
	GeminiToolChoiceConfig,
	GeminiTool as GeminiToolT,
	GeminiTurn,
} from "./types";
import { TextContent } from "../../../types/content";
import { CompactionBlock, ReasoningBlock, RedactedReasoningBlock } from "../../../types/reasoning";
import {
	ServerToolCallBlock,
	ServerToolResultBlock,
	ShellCallBlock,
	ToolCallBlock,
} from "../../../types/tool";
import type { StopReason, Usage } from "../../../types/metadata";
import type { AssistantContentBlock, UserContentBlock } from "../../../types/message";
import type { Message } from "../../../types/message";
import type { StreamEvent } from "../../../types/stream";
import type { OutputFormat, ThinkingConfig } from "../../../types/config";
import type { Tool, ToolChoice } from "../../../types/tool";
import {
	AuthenticationError,
	ContextLengthError,
	InputValidationError,
	ModelNotFoundError,
	ProviderError,
	RateLimitError,
	type LLMError,
} from "../../../errors";

type GeminiContentT = GeminiContent;

const WideContentBlock = Schema.Union(
	TextContent,
	ToolCallBlock,
	ServerToolCallBlock,
	ReasoningBlock,
	RedactedReasoningBlock,
	CompactionBlock,
	ServerToolResultBlock,
	ShellCallBlock,
);
type WideContentBlockT = typeof WideContentBlock.Type;

export const decodeContentBlock = (block: GeminiContentT): WideContentBlockT | null => {
	switch (block.type) {
		case "text":
			return {
				type: "text" as const,
				text: block.text,
				...(block.annotations && {
					annotations: block.annotations.map((a: GeminiAnnotation) => ({
						type: "url" as const,
						url: a.url,
						title: a.title,
						startIndex: a.start_index,
						endIndex: a.end_index,
					})),
				}),
			};
		case "thought":
			return {
				type: "reasoning" as const,
				text: block.summary?.map((s) => s.text).join("") ?? "",
				signature: block.signature,
			};
		case "function_call":
			return {
				type: "tool_call" as const,
				callId: block.id,
				name: block.name,
				input: block.arguments,
			};
		case "function_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "code_execution_call":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: "code_execution",
				input: block.arguments as Record<string, unknown>,
			};
		case "code_execution_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "url_context_call":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: "url_context",
				input: block.arguments as Record<string, unknown>,
			};
		case "url_context_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "google_search_call":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: "google_search",
				input: block.arguments as Record<string, unknown>,
			};
		case "google_search_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "mcp_server_tool_call":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: block.name,
				input: block.arguments,
			};
		case "mcp_server_tool_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "file_search_call":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: "file_search",
				input: {},
			};
		case "file_search_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "google_maps_call":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: "google_maps",
				input: (block.arguments ?? {}) as Record<string, unknown>,
			};
		case "google_maps_result":
			return {
				type: "server_tool_result" as const,
				callId: block.call_id,
				content: block.result,
			};
		case "image":
		case "audio":
		case "document":
		case "video":
			return null;
	}
};

type UsageT = typeof Usage.Type;

export const decodeUsage = (u: typeof GeminiUsage.Type): UsageT => ({
	inputTokens: u.total_input_tokens ?? 0,
	outputTokens: u.total_output_tokens ?? 0,
	cacheReadTokens: u.total_cached_tokens,
	reasoningTokens: u.total_thought_tokens,
	totalTokens: u.total_tokens,
});

export const decodeStopReason = (
	status: GeminiInteractionStatus,
): Either.Either<StopReason, LLMError> => {
	switch (status) {
		case "completed":
			return Either.right("end_turn");
		case "requires_action":
			return Either.right("tool_use");
		case "cancelled":
			return Either.right("end_turn");
		case "in_progress":
			return Either.right("end_turn");
		case "failed":
			return Either.left(new ProviderError({ message: "Interaction failed", provider: "google" }));
		case "incomplete":
			return Either.left(
				new ContextLengthError({ message: "Output truncated: max tokens reached" }),
			);
	}
};

export const decodeError = (statusCode: number, body: unknown): LLMError => {
	const message =
		body && typeof body === "object" && "error" in body
			? ((body as { error: { message?: string } }).error.message ?? "Unknown error")
			: "Unknown error";

	const status =
		body && typeof body === "object" && "error" in body
			? ((body as { error: { status?: string } }).error.status ?? "")
			: "";

	switch (statusCode) {
		case 400:
			if (status === "RESOURCE_EXHAUSTED" || message.includes("context")) {
				return new ContextLengthError({ message });
			}
			return new InputValidationError({ message });
		case 401:
		case 403:
			return new AuthenticationError({ message });
		case 404:
			return new ModelNotFoundError({ message, model: "" });
		case 429:
			return new RateLimitError({ message });
		default:
			return new ProviderError({
				message,
				provider: "google",
				statusCode,
				...(status ? { code: status } : {}),
			});
	}
};

export const encodeUserContent = (block: UserContentBlock): GeminiContent | null => {
	switch (block.type) {
		case "text":
			return { type: "text" as const, text: block.text };
		case "image":
			return block.source.type === "base64"
				? {
						type: "image" as const,
						data: block.source.data,
						mime_type: block.source.mediaType as "image/png",
					}
				: { type: "image" as const, uri: block.source.url };
		case "audio":
			return block.source.type === "base64"
				? {
						type: "audio" as const,
						data: block.source.data,
						mime_type: block.source.mediaType as "audio/wav",
					}
				: { type: "audio" as const, uri: block.source.url };
		case "document":
			return block.source.type === "base64"
				? {
						type: "document" as const,
						data: block.source.data,
						mime_type: block.source.mediaType as "application/pdf",
					}
				: { type: "document" as const, uri: block.source.url };
		case "video":
			return block.source.type === "base64"
				? {
						type: "video" as const,
						data: block.source.data,
						mime_type: block.source.mediaType as "video/mp4",
					}
				: { type: "video" as const, uri: block.source.url };
		case "tool_result": {
			const raw = typeof block.output === "string" ? block.output : JSON.stringify(block.output);
			return {
				type: "function_result" as const,
				call_id: block.callId,
				result: block.isError
					? JSON.stringify({ status: "error", error: raw })
					: JSON.stringify({ status: "success", result: raw }),
			};
		}
		case "server_tool_result":
			return {
				type: "function_result" as const,
				call_id: block.callId,
				result: block.content as string,
			};
		case "shell_result":
			return {
				type: "function_result" as const,
				call_id: block.callId,
				result: JSON.stringify({
					stdout: block.stdout,
					stderr: block.stderr,
					exitCode: block.exitCode,
					timedOut: block.timedOut,
				}),
			};
	}
};

export const encodeAssistantContent = (block: AssistantContentBlock): GeminiContent | null => {
	switch (block.type) {
		case "text":
			return { type: "text" as const, text: block.text };
		case "tool_call":
			return {
				type: "function_call" as const,
				id: block.callId,
				name: block.name,
				arguments: block.input,
			};
		case "server_tool_call":
			return null;
		case "reasoning":
			return {
				type: "thought" as const,
				...(block.text ? { summary: [{ type: "text" as const, text: block.text }] } : {}),
				...(block.signature ? { signature: block.signature } : {}),
			};
		case "redacted_reasoning":
			return null;
		case "compaction":
			return null;
		case "shell_call":
			return {
				type: "function_call" as const,
				id: block.callId,
				name: "bash",
				arguments: { command: block.commands.join(" && ") },
			};
	}
};

export const encodeInput = (
	messages: Message[],
): { system_instruction?: string; input: GeminiTurn[] } => {
	const systemParts: string[] = [];
	const turns: GeminiTurn[] = [];

	for (const msg of messages) {
		switch (msg.role) {
			case "system":
				systemParts.push(msg.content);
				break;
			case "user": {
				if (typeof msg.content === "string") {
					turns.push({ role: "user", content: msg.content });
					break;
				}
				const content = msg.content
					.map(encodeUserContent)
					.filter((b): b is GeminiContent => b !== null);
				if (content.length > 0) {
					turns.push({ role: "user", content });
				}
				break;
			}
			case "assistant": {
				const content = msg.content
					.map(encodeAssistantContent)
					.filter((b): b is GeminiContent => b !== null);
				if (content.length > 0) {
					turns.push({ role: "model", content });
				}
				break;
			}
		}
	}

	return {
		...(systemParts.length > 0 ? { system_instruction: systemParts.join("\n") } : {}),
		input: turns,
	};
};

export const encodeTool = (tool: Tool): GeminiToolT | null => {
	switch (tool.type) {
		case "function":
			return {
				type: "function" as const,
				name: tool.name,
				...(tool.description ? { description: tool.description } : {}),
				...(tool.parameters ? { parameters: tool.parameters } : {}),
			};
		case "web_search":
			return { type: "google_search" as const };
		case "code_execution":
			return { type: "code_execution" as const };
		case "computer_use":
			return {
				type: "computer_use" as const,
				...(tool.environment ? { environment: tool.environment as "browser" } : {}),
			};
		case "file_search":
			return {
				type: "file_search" as const,
				...(tool.storeIds ? { file_search_store_names: tool.storeIds } : {}),
				...(tool.maxResults !== undefined ? { top_k: tool.maxResults } : {}),
			};
		case "mcp":
			return {
				type: "mcp_server" as const,
				name: tool.name,
				url: tool.url,
				...(tool.headers ? { headers: tool.headers } : {}),
				...(tool.allowedTools ? { allowed_tools: [{ tools: tool.allowedTools }] } : {}),
			};
	}
};

export const encodeToolChoice = (choice: ToolChoice): GeminiToolChoiceConfig => {
	switch (choice.type) {
		case "auto":
			return "auto";
		case "any":
			return "any";
		case "none":
			return "none";
		case "tool":
			return { mode: "validated", allowed_function_names: [choice.name] };
	}
};

export const encodeGenerationConfig = (params: {
	thinking?: ThinkingConfig;
	temperature?: number;
	topP?: number;
	maxOutputTokens?: number;
	stopSequences?: string[];
	toolChoice?: ToolChoice;
}): GeminiGenerationConfig => {
	const thinkingLevel =
		params.thinking?.type === "enabled"
			? ("high" as const)
			: params.thinking?.type === "adaptive"
				? ("medium" as const)
				: undefined;

	const thinkingSummaries =
		params.thinking && params.thinking.type !== "disabled"
			? params.thinking.display === "summarized"
				? ("auto" as const)
				: ("none" as const)
			: undefined;

	return {
		...(thinkingLevel ? { thinking_level: thinkingLevel } : {}),
		...(thinkingSummaries ? { thinking_summaries: thinkingSummaries } : {}),
		...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
		...(params.topP !== undefined ? { top_p: params.topP } : {}),
		...(params.maxOutputTokens !== undefined ? { max_output_tokens: params.maxOutputTokens } : {}),
		...(params.stopSequences ? { stop_sequences: params.stopSequences } : {}),
		...(params.toolChoice ? { tool_choice: encodeToolChoice(params.toolChoice) } : {}),
	};
};

export const encodeOutputFormat = (
	format: OutputFormat,
): { response_format?: Record<string, unknown>; response_mime_type?: string } => {
	switch (format.type) {
		case "text":
			return {};
		case "json_object":
			return { response_mime_type: "application/json" };
		case "json_schema":
			return { response_format: format.schema, response_mime_type: "application/json" };
	}
};

export const encodeRequest = (params: {
	model: string;
	messages: Message[];
	maxOutputTokens?: number;
	tools?: Tool[];
	toolChoice?: ToolChoice;
	thinking?: ThinkingConfig;
	outputFormat?: OutputFormat;
	temperature?: number;
	topP?: number;
	stopSequences?: string[];
	stream?: boolean;
}): GeminiInteractionsCreateRequest => {
	const { system_instruction, input } = encodeInput(params.messages);
	const tools = params.tools?.map(encodeTool).filter((t): t is GeminiToolT => t !== null);

	const genConfigParams: Parameters<typeof encodeGenerationConfig>[0] = {};
	if (params.thinking) genConfigParams.thinking = params.thinking;
	if (params.temperature !== undefined) genConfigParams.temperature = params.temperature;
	if (params.topP !== undefined) genConfigParams.topP = params.topP;
	if (params.maxOutputTokens !== undefined)
		genConfigParams.maxOutputTokens = params.maxOutputTokens;
	if (params.stopSequences) genConfigParams.stopSequences = params.stopSequences;
	if (params.toolChoice) genConfigParams.toolChoice = params.toolChoice;
	const genConfig = encodeGenerationConfig(genConfigParams);
	const hasGenConfig = Object.keys(genConfig).length > 0;

	const outputFmt = params.outputFormat ? encodeOutputFormat(params.outputFormat) : {};

	return {
		model: params.model as "gemini-2.5-flash",
		input,
		...(system_instruction ? { system_instruction } : {}),
		...(tools && tools.length > 0 ? { tools } : {}),
		...(hasGenConfig ? { generation_config: genConfig } : {}),
		...(outputFmt.response_format ? { response_format: outputFmt.response_format } : {}),
		...(outputFmt.response_mime_type ? { response_mime_type: outputFmt.response_mime_type } : {}),
		...(params.stream !== undefined ? { stream: params.stream } : {}),
	};
};

const ASSISTANT_BLOCK_TYPES = new Set([
	"text",
	"tool_call",
	"server_tool_call",
	"reasoning",
	"redacted_reasoning",
	"compaction",
	"shell_call",
]);

export const createStreamDecoder = () => {
	const fnCalls = new Map<number, { id?: string; name?: string; args?: Record<string, unknown> }>();
	let lastUsage: UsageT | undefined;

	return (rawEvent: unknown): StreamEvent[] => {
		const event = Schema.decodeUnknownSync(GeminiStreamEvent)(rawEvent);

		switch (event.event_type) {
			case "interaction.start":
				return [{ type: "response.start" as const }];

			case "content.start": {
				const decoded = decodeContentBlock(event.content);
				const contentBlock =
					decoded && ASSISTANT_BLOCK_TYPES.has(decoded.type)
						? (decoded as AssistantContentBlock)
						: undefined;
				return [
					{
						type: "content.start" as const,
						index: event.index,
						...(contentBlock && { contentBlock }),
					},
				];
			}

			case "content.delta": {
				const delta = event.delta;
				switch (delta.type) {
					case "text":
						return [
							{
								type: "content.delta" as const,
								index: event.index,
								delta: { type: "text_delta" as const, text: delta.text },
							},
						];
					case "thought_summary":
						if (delta.content) {
							return [
								{
									type: "content.delta" as const,
									index: event.index,
									delta: { type: "reasoning_delta" as const, text: delta.content.text },
								},
							];
						}
						return [];
					case "thought_signature":
						return [
							{
								type: "content.delta" as const,
								index: event.index,
								delta: { type: "signature_delta" as const, signature: delta.signature },
							},
						];
					case "function_call": {
						const state = fnCalls.get(event.index) ?? {};
						if (delta.id) state.id = delta.id;
						if (delta.name) state.name = delta.name;
						if (delta.arguments) state.args = delta.arguments;
						fnCalls.set(event.index, state);
						if (state.id && state.name && state.args) {
							fnCalls.delete(event.index);
							return [
								{
									type: "content.delta" as const,
									index: event.index,
									delta: {
										type: "tool_call_end" as const,
										callId: state.id,
										name: state.name,
										input: state.args,
									},
								},
							];
						}
						return [];
					}
					case "function_result":
					case "image":
					case "audio":
					case "document":
					case "video":
						return [];
					default: {
						return [];
					}
				}
			}

			case "content.stop": {
				const fc = fnCalls.get(event.index);
				if (fc?.id && fc?.name) {
					fnCalls.delete(event.index);
					return [
						{
							type: "content.delta" as const,
							index: event.index,
							delta: {
								type: "tool_call_end" as const,
								callId: fc.id,
								name: fc.name,
								input: fc.args ?? {},
							},
						},
						{ type: "content.stop" as const, index: event.index },
					];
				}
				return [{ type: "content.stop" as const, index: event.index }];
			}

			case "interaction.complete": {
				const interaction = event.interaction;
				if (interaction.usage) {
					lastUsage = decodeUsage(interaction.usage);
				}
				const result = decodeStopReason(interaction.status);
				if (Either.isLeft(result)) {
					return [
						{
							type: "error" as const,
							error: {
								type: "error" as const,
								code: result.left._tag,
								message: result.left.message,
							},
						},
					];
				}
				return [
					{
						type: "response.complete" as const,
						stopReason: result.right,
						usage: lastUsage,
					},
				];
			}

			case "interaction.status_update": {
				const result = decodeStopReason(event.status);
				if (Either.isLeft(result)) {
					return [
						{
							type: "response.delta" as const,
						},
					];
				}
				return [
					{
						type: "response.delta" as const,
						stopReason: result.right,
					},
				];
			}

			case "error":
				return [
					{
						type: "error" as const,
						error: {
							type: "error" as const,
							code: event.error.code,
							message: event.error.message,
						},
					},
				];
		}

		return [];
	};
};
