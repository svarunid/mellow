import { Either, Schema } from "effect";
import { OpenAIResponsesStreamEvent, type OpenAIResponsesUsage } from "./types";
import type {
	OpenAIAnnotation,
	OpenAIResponsesInputContentPart,
	OpenAIResponsesInputItem,
	OpenAIResponsesOutputItem as OpenAIOutputItemT,
	OpenAIResponsesReasoningConfig,
	OpenAIResponsesRequest,
	OpenAIResponsesResponse,
	OpenAIResponsesTextFormat,
	OpenAIResponsesTool as OpenAIToolT,
	OpenAIResponsesToolChoice as OpenAIToolChoiceT,
} from "./types";
import { TextContent } from "../../../types/content";
import { CompactionBlock, ReasoningBlock, RedactedReasoningBlock } from "../../../types/reasoning";
import {
	ServerToolCallBlock,
	ServerToolResultBlock,
	ShellCallBlock,
	ToolCallBlock,
} from "../../../types/tool";
import type { Usage } from "../../../types/metadata";
import type { AssistantContentBlock, UserContentBlock } from "../../../types/message";
import type { Message } from "../../../types/message";
import type { StopReason } from "../../../types/metadata";
import type { StreamEvent } from "../../../types/stream";
import type { ContextManagement, OutputFormat, ThinkingConfig } from "../../../types/config";
import type { Tool, ToolChoice } from "../../../types/tool";
import {
	AuthenticationError,
	BillingError,
	ContentPolicyError,
	ContextLengthError,
	InputValidationError,
	ModelNotFoundError,
	ProviderError,
	RateLimitError,
	type LLMError,
} from "../../../errors";

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

const parseJsonSafe = (s: string): Record<string, unknown> => {
	try {
		return JSON.parse(s);
	} catch {
		return { _raw: s };
	}
};

export const decodeOutputItem = (item: OpenAIOutputItemT): WideContentBlockT[] => {
	switch (item.type) {
		case "message":
			return item.content.map((part) => {
				if (part.type === "output_text") {
					return {
						type: "text" as const,
						text: part.text,
						...(part.annotations && {
							annotations: part.annotations.map((a: OpenAIAnnotation) => {
								switch (a.type) {
									case "url_citation":
										return {
											type: "url" as const,
											url: a.url,
											title: a.title,
											startIndex: a.start_index,
											endIndex: a.end_index,
										};
									case "file_citation":
										return {
											type: "file" as const,
											fileId: a.file_id,
											filename: a.filename,
										};
									case "container_file_citation":
										return {
											type: "file" as const,
											fileId: a.file_id,
											filename: a.filename,
										};
									case "file_path":
										return {
											type: "file" as const,
											fileId: a.file_id,
										};
								}
							}),
						}),
					};
				}
				return {
					type: "text" as const,
					text: part.refusal,
				};
			});
		case "function_call":
			return [
				{
					type: "tool_call" as const,
					callId: item.call_id,
					name: item.name,
					input: parseJsonSafe(item.arguments),
				},
			];
		case "reasoning":
			return [
				{
					type: "reasoning" as const,
					text: item.summary.map((s) => s.text).join(""),
					signature: item.encrypted_content,
				},
			];
		case "compaction":
			return [
				{
					type: "compaction" as const,
					summary: item.encrypted_content,
				},
			];
		case "web_search_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: "web_search",
					input: item.action as unknown as Record<string, unknown>,
				},
			];
		case "file_search_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: "file_search",
					input: { queries: item.queries } as Record<string, unknown>,
				},
			];
		case "code_interpreter_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: "code_execution",
					input: { code: item.code } as Record<string, unknown>,
				},
			];
		case "computer_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.call_id,
					name: "computer_use",
					input: item.action as unknown as Record<string, unknown>,
				},
			];
		case "mcp_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: item.name,
					input: parseJsonSafe(item.arguments),
				},
			];
		case "mcp_approval_request":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: "mcp_approval",
					input: {} as Record<string, unknown>,
				},
			];
		case "mcp_list_tools":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: "mcp_list_tools",
					input: {} as Record<string, unknown>,
				},
			];
		case "local_shell_call":
			return [
				{
					type: "shell_call" as const,
					callId: item.id,
					commands: item.action.command,
					...(item.action.timeout_ms !== undefined ? { timeoutMs: item.action.timeout_ms } : {}),
					...(item.action.env ? { env: item.action.env } : {}),
					...(item.action.working_directory
						? { workingDirectory: item.action.working_directory }
						: {}),
				},
			];
		case "shell_call":
			return [
				{
					type: "shell_call" as const,
					callId: item.id ?? item.call_id,
					commands: item.action.commands,
					...(item.action.timeout_ms !== undefined ? { timeoutMs: item.action.timeout_ms } : {}),
					...(item.action.max_output_length !== undefined
						? { maxOutputLength: item.action.max_output_length }
						: {}),
				},
			];
		case "apply_patch_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id ?? item.call_id,
					name: "apply_patch",
					input: { operation: item.operation } as Record<string, unknown>,
				},
			];
		case "image_generation_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id,
					name: "image_generation",
					input: {} as Record<string, unknown>,
				},
			];
		case "tool_search_call":
			return [
				{
					type: "server_tool_call" as const,
					callId: item.id ?? item.call_id ?? "",
					name: "tool_search",
					input: {} as Record<string, unknown>,
				},
			];
		case "tool_search_output":
			return [
				{
					type: "server_tool_result" as const,
					callId: item.id ?? item.call_id ?? "",
					content: item.tools,
				},
			];
		default:
			return [];
	}
};

type UsageT = typeof Usage.Type;

export const decodeUsage = (u: typeof OpenAIResponsesUsage.Type): UsageT => ({
	inputTokens: u.input_tokens,
	outputTokens: u.output_tokens,
	totalTokens: u.total_tokens,
	cacheReadTokens: u.input_tokens_details?.cached_tokens,
	reasoningTokens: u.output_tokens_details?.reasoning_tokens,
});

export const decodeStopReason = (
	response: OpenAIResponsesResponse,
): Either.Either<StopReason, LLMError> => {
	const hasFunctionCall = response.output.some((item) => item.type === "function_call");

	switch (response.status) {
		case "completed":
			return Either.right(hasFunctionCall ? "tool_use" : "end_turn");
		case "incomplete": {
			const reason = response.incomplete_details?.reason;
			if (reason === "max_output_tokens")
				return Either.left(
					new ContextLengthError({ message: "Output truncated: max tokens reached" }),
				);
			if (reason === "content_filter")
				return Either.left(new ContentPolicyError({ message: "Content filtered by provider" }));
			if (reason === "max_tool_calls") return Either.right("tool_use");
			return Either.left(
				new ContextLengthError({ message: "Output truncated: incomplete response" }),
			);
		}
		case "failed":
			return Either.left(
				new ProviderError({
					message: response.error?.message ?? "Request failed",
					provider: "openai",
					...(response.error?.code ? { code: response.error.code } : {}),
				}),
			);
		case "cancelled":
			return Either.right("end_turn");
		default:
			return Either.right("end_turn");
	}
};

export const decodeError = (statusCode: number, body: unknown): LLMError => {
	const error =
		body && typeof body === "object" && "error" in body
			? (body as { error: { type?: string; code?: string; message?: string } }).error
			: { message: "Unknown error" };

	const message = error.message ?? "Unknown error";
	const code = error.code ?? error.type ?? "";

	switch (statusCode) {
		case 400:
			if (code === "context_length_exceeded" || message.includes("context")) {
				return new ContextLengthError({ message });
			}
			return new InputValidationError({ message });
		case 401:
			return new AuthenticationError({ message });
		case 402:
			return new BillingError({ message });
		case 403:
			if (message.toLowerCase().includes("content")) {
				return new ContentPolicyError({ message });
			}
			return new AuthenticationError({ message });
		case 404:
			return new ModelNotFoundError({ message, model: "" });
		case 429:
			return new RateLimitError({ message });
		default:
			return new ProviderError({
				message,
				provider: "openai",
				statusCode,
				...(code ? { code } : {}),
			});
	}
};

export const encodeInputContentPart = (
	block: UserContentBlock,
): OpenAIResponsesInputContentPart | null => {
	switch (block.type) {
		case "text":
			return { type: "input_text" as const, text: block.text };
		case "image":
			return {
				type: "input_image" as const,
				detail: "auto" as const,
				image_url:
					block.source.type === "url"
						? block.source.url
						: `data:${block.source.mediaType};base64,${block.source.data}`,
			};
		case "document":
			return {
				type: "input_file" as const,
				...(block.source.type === "base64"
					? { file_data: `data:${block.source.mediaType};base64,${block.source.data}` }
					: { file_url: block.source.url }),
			};
		case "audio":
		case "video":
			return null;
		case "tool_result":
		case "server_tool_result":
		case "shell_result":
			return null;
	}
};

const encodeAssistantBlock = (block: AssistantContentBlock): OpenAIResponsesInputItem[] => {
	switch (block.type) {
		case "text":
			return [
				{
					role: "assistant" as const,
					content: block.text,
				},
			];
		case "tool_call":
			return [
				{
					type: "function_call" as const,
					call_id: block.callId,
					name: block.name,
					arguments: JSON.stringify(block.input),
				},
			];
		case "server_tool_call":
			return [];
		case "reasoning":
			return [
				{
					type: "reasoning" as const,
					summary: [{ type: "summary_text" as const, text: block.text }],
					...(block.signature ? { encrypted_content: block.signature } : {}),
				},
			];
		case "redacted_reasoning":
			return [];
		case "compaction":
			return [
				{
					type: "compaction" as const,
					encrypted_content: block.summary,
				},
			];
		case "shell_call":
			return [
				{
					type: "shell_call" as const,
					id: block.callId,
					call_id: block.callId,
					action: {
						commands: block.commands,
						...(block.timeoutMs !== undefined ? { timeout_ms: block.timeoutMs } : {}),
						...(block.maxOutputLength !== undefined
							? { max_output_length: block.maxOutputLength }
							: {}),
					},
					status: "completed" as const,
				},
			];
	}
};

export const encodeInputItems = (
	messages: Message[],
): { instructions?: string; input: OpenAIResponsesInputItem[] } => {
	const systemParts: string[] = [];
	const input: OpenAIResponsesInputItem[] = [];

	for (const msg of messages) {
		switch (msg.role) {
			case "system":
				systemParts.push(msg.content);
				break;
			case "user": {
				if (typeof msg.content === "string") {
					input.push({ role: "user" as const, content: msg.content });
					break;
				}
				const toolResults: OpenAIResponsesInputItem[] = [];
				const contentParts: OpenAIResponsesInputContentPart[] = [];
				for (const block of msg.content) {
					if (block.type === "shell_result") {
						toolResults.push({
							type: "shell_call_output" as const,
							call_id: block.callId,
							output: [
								{
									stdout: block.stdout,
									stderr: block.stderr,
									outcome: block.timedOut
										? { type: "timeout" as const }
										: { type: "exit" as const, exit_code: block.exitCode },
								},
							],
						});
						continue;
					}
					if (block.type === "tool_result") {
						const raw =
							typeof block.output === "string" ? block.output : JSON.stringify(block.output);
						toolResults.push({
							type: "function_call_output" as const,
							call_id: block.callId,
							output: block.isError
								? JSON.stringify({ status: "error", error: raw })
								: JSON.stringify({ status: "success", result: raw }),
						});
					} else if (block.type === "server_tool_result") {
						continue;
					} else {
						const part = encodeInputContentPart(block);
						if (part) contentParts.push(part);
					}
				}
				if (contentParts.length > 0) {
					input.push({ role: "user" as const, content: contentParts });
				}
				input.push(...toolResults);
				break;
			}
			case "assistant":
				for (const block of msg.content) {
					input.push(...encodeAssistantBlock(block));
				}
				break;
		}
	}

	return {
		...(systemParts.length > 0 ? { instructions: systemParts.join("\n") } : {}),
		input,
	};
};

export const encodeTool = (tool: Tool): OpenAIToolT | null => {
	switch (tool.type) {
		case "function":
			if (tool.name === "bash") {
				return {
					type: "shell" as const,
					environment: { type: "local" as const },
				};
			}
			return {
				type: "function" as const,
				name: tool.name,
				...(tool.description ? { description: tool.description } : {}),
				parameters: tool.parameters ?? {},
				...(tool.strict !== undefined ? { strict: tool.strict } : {}),
				...(tool.deferLoading !== undefined ? { defer_loading: tool.deferLoading } : {}),
			};
		case "web_search":
			return {
				type: "web_search" as const,
				...(tool.userLocation
					? {
							user_location: {
								type: "approximate" as const,
								...(tool.userLocation.city ? { city: tool.userLocation.city } : {}),
								...(tool.userLocation.country ? { country: tool.userLocation.country } : {}),
								...(tool.userLocation.region ? { region: tool.userLocation.region } : {}),
								...(tool.userLocation.timezone ? { timezone: tool.userLocation.timezone } : {}),
							},
						}
					: {}),
				...(tool.allowedDomains ? { filters: { allowed_domains: tool.allowedDomains } } : {}),
			};
		case "code_execution":
			return { type: "code_interpreter" as const };
		case "computer_use":
			return {
				type: "computer" as const,
				...(tool.displayWidth !== undefined ? { display_width: tool.displayWidth } : {}),
				...(tool.displayHeight !== undefined ? { display_height: tool.displayHeight } : {}),
				...(tool.environment ? { environment: tool.environment as "browser" } : {}),
			};
		case "file_search":
			return {
				type: "file_search" as const,
				vector_store_ids: tool.storeIds ?? [],
				...(tool.maxResults !== undefined ? { max_num_results: tool.maxResults } : {}),
			};
		case "mcp":
			return {
				type: "mcp" as const,
				server_label: tool.name,
				server_url: tool.url,
				...(tool.headers ? { headers: tool.headers } : {}),
				...(tool.allowedTools ? { allowed_tools: tool.allowedTools } : {}),
			};
	}
};

export const encodeToolChoice = (choice: ToolChoice): OpenAIToolChoiceT => {
	switch (choice.type) {
		case "auto":
			return "auto";
		case "any":
			return "required";
		case "none":
			return "none";
		case "tool":
			return { type: "function" as const, name: choice.name };
	}
};

export const encodeReasoningConfig = (
	config: ThinkingConfig,
): OpenAIResponsesReasoningConfig | undefined => {
	switch (config.type) {
		case "enabled":
			return {
				effort: "high",
				...(config.display === "summarized" ? { generate_summary: "auto" as const } : {}),
			};
		case "disabled":
			return { effort: "none" };
		case "adaptive":
			return {
				effort: "medium",
				...(config.display === "summarized" ? { generate_summary: "auto" as const } : {}),
			};
	}
};

export const encodeOutputFormat = (
	format: OutputFormat,
): { format: OpenAIResponsesTextFormat } | undefined => {
	switch (format.type) {
		case "text":
			return undefined;
		case "json_object":
			return { format: { type: "json_object" as const } };
		case "json_schema":
			return {
				format: {
					type: "json_schema" as const,
					name: format.name ?? "response",
					schema: format.schema,
					...(format.strict !== undefined ? { strict: format.strict } : {}),
				},
			};
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
	contextManagement?: ContextManagement;
	temperature?: number;
	topP?: number;
	stream?: boolean;
	parallelToolCalls?: boolean;
}): OpenAIResponsesRequest => {
	const { instructions, input } = encodeInputItems(params.messages);
	const tools = params.tools?.map(encodeTool).filter((t): t is OpenAIToolT => t !== null);

	return {
		model: params.model,
		...(input.length > 0 ? { input } : {}),
		...(instructions ? { instructions } : {}),
		...(tools && tools.length > 0 ? { tools } : {}),
		...(params.toolChoice ? { tool_choice: encodeToolChoice(params.toolChoice) } : {}),
		...(params.thinking ? { reasoning: encodeReasoningConfig(params.thinking) } : {}),
		...(params.outputFormat ? { text: encodeOutputFormat(params.outputFormat) } : {}),
		...(params.maxOutputTokens !== undefined ? { max_output_tokens: params.maxOutputTokens } : {}),
		...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
		...(params.topP !== undefined ? { top_p: params.topP } : {}),
		...(params.stream !== undefined ? { stream: params.stream } : {}),
		...(params.parallelToolCalls !== undefined
			? { parallel_tool_calls: params.parallelToolCalls }
			: {}),
		...(params.contextManagement?.compaction?.enabled
			? {
					context_management: [
						{
							type: "compaction" as const,
							...(params.contextManagement.compaction.threshold
								? { compact_threshold: params.contextManagement.compaction.threshold }
								: {}),
						},
					],
				}
			: {}),
		...(params.contextManagement?.truncation?.enabled
			? {
					truncation: params.contextManagement.truncation.maxTokens
						? { type: "auto" as const, max_tokens: params.contextManagement.truncation.maxTokens }
						: ("auto" as const),
				}
			: {}),
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
	return (rawEvent: unknown): StreamEvent[] => {
		const event = Schema.decodeUnknownSync(OpenAIResponsesStreamEvent)(rawEvent);

		switch (event.type) {
			case "response.created":
				return [{ type: "response.start" as const }];

			case "response.output_item.added": {
				const blocks = decodeOutputItem(event.item);
				const first = blocks[0];
				const contentBlock =
					first && ASSISTANT_BLOCK_TYPES.has(first.type)
						? (first as AssistantContentBlock)
						: undefined;
				return [
					{
						type: "content.start" as const,
						index: event.output_index,
						...(contentBlock && { contentBlock }),
					},
				];
			}

			case "response.output_text.delta":
				return [
					{
						type: "content.delta" as const,
						index: event.output_index,
						delta: { type: "text_delta" as const, text: event.delta },
					},
				];

			case "response.refusal.delta":
				return [
					{
						type: "content.delta" as const,
						index: event.output_index,
						delta: { type: "text_delta" as const, text: event.delta },
					},
				];

			case "response.function_call_arguments.delta":
				return [];

			case "response.function_call_arguments.done":
				return [
					{
						type: "content.delta" as const,
						index: event.output_index,
						delta: {
							type: "tool_call_end" as const,
							callId: event.call_id,
							name: event.name,
							input: parseJsonSafe(event.arguments),
						},
					},
				];

			case "response.reasoning_summary_text.delta":
				return [
					{
						type: "content.delta" as const,
						index: event.output_index,
						delta: { type: "reasoning_delta" as const, text: event.delta },
					},
				];

			case "response.output_item.done":
				return [{ type: "content.stop" as const, index: event.output_index }];

			case "response.content_part.added":
				return [
					{
						type: "content.start" as const,
						index: event.output_index,
					},
				];

			case "response.content_part.done":
				return [{ type: "content.stop" as const, index: event.output_index }];

			case "response.completed":
			case "response.incomplete":
			case "response.failed": {
				const resp = event.response;
				const usage = resp.usage ? decodeUsage(resp.usage) : undefined;
				const result = decodeStopReason(resp);
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
						usage,
					},
				];
			}

			case "error":
				return [
					{
						type: "error" as const,
						error: {
							type: "error" as const,
							code: event.code ?? undefined,
							message: event.message,
						},
					},
				];

			default:
				return [];
		}
	};
};
