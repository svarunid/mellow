import { Either, Schema } from "effect";
import {
	AuthenticationError,
	BillingError,
	ContentPolicyError,
	ContextLengthError,
	InputValidationError,
	type LLMError,
	ModelNotFoundError,
	ProviderError,
	RateLimitError,
} from "../../../errors";
import type { ContextManagement, OutputFormat, ThinkingConfig } from "../../../types/config";
import type { DocumentAnnotation, UrlAnnotation } from "../../../types/content";
import type { AssistantContentBlock, Message, UserContentBlock } from "../../../types/message";
import { WideContentBlock } from "../../../types/message";
import type { StopReason, TokenUsage } from "../../../types/metadata";
import type { StreamEvent } from "../../../types/stream";
import type { Tool, ToolChoice } from "../../../types/tool";
import type {
	AnthropicContentBlock,
	AnthropicMessage,
	AnthropicMessagesRequest,
	AnthropicTextCitation,
	AnthropicThinkingConfig as AnthropicThinkingConfigT,
	AnthropicToolChoice as AnthropicToolChoiceT,
	AnthropicTool as AnthropicToolT,
} from "./types";
import {
	type AnthropicMessagesUsage,
	AnthropicResponseContentBlock,
	type AnthropicStopReason,
	AnthropicStreamEvent,
} from "./types";

type AnthropicCitation = AnthropicTextCitation;
type UnifiedAnnotation = UrlAnnotation | DocumentAnnotation;

type AnthropicResponseContentBlockT = typeof AnthropicResponseContentBlock.Type;

export const decodeContentBlock = (block: AnthropicResponseContentBlockT): WideContentBlock => {
	switch (block.type) {
		case "text":
			return {
				type: "text" as const,
				text: block.text,
				...(block.citations && {
					annotations: block.citations.map((c: AnthropicCitation): UnifiedAnnotation => {
						switch (c.type) {
							case "char_location":
							case "page_location":
							case "content_block_location":
								return {
									type: "document" as const,
									documentIndex: c.document_index,
									documentTitle: c.document_title,
									citedText: c.cited_text,
								};
							case "web_search_result_location":
								return {
									type: "url" as const,
									url: c.url,
									title: c.title,
									citedText: c.cited_text,
								};
							case "search_result_location":
								return {
									type: "document" as const,
									documentIndex: c.search_result_index,
									documentTitle: c.title,
									citedText: c.cited_text,
								};
						}
					}),
				}),
			};
		case "tool_use": {
			if (block.name === "bash") {
				const input = block.input as { command?: string; restart?: boolean };
				return {
					type: "shell_call" as const,
					callId: block.id,
					commands: input.command ? [input.command] : [],
					...(input.restart !== undefined ? { restart: input.restart } : {}),
				};
			}
			return {
				type: "tool_call" as const,
				callId: block.id,
				name: block.name,
				input: block.input,
			};
		}
		case "thinking":
			return {
				type: "reasoning" as const,
				text: block.thinking,
				signature: block.signature,
			};
		case "redacted_thinking":
			return {
				type: "redacted_reasoning" as const,
				data: block.data,
			};
		case "server_tool_use":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: block.name,
				input: block.input,
			};
		case "mcp_tool_use":
			return {
				type: "server_tool_call" as const,
				callId: block.id,
				name: block.name,
				input: block.input,
			};
		case "compaction":
			return {
				type: "compaction" as const,
				summary: block.content,
			};
		case "web_search_result":
			return {
				type: "server_tool_result" as const,
				callId: "",
				content: {
					title: block.title,
					url: block.url,
					encrypted_content: block.encrypted_content,
					page_age: block.page_age,
				},
			};
		case "tool_search_tool_result":
			return {
				type: "server_tool_result" as const,
				callId: block.tool_use_id,
				content: block.content,
			};
		case "web_search_tool_result":
		case "web_fetch_tool_result":
		case "code_execution_tool_result":
		case "bash_code_execution_tool_result":
		case "text_editor_code_execution_tool_result":
		case "mcp_tool_result":
			return {
				type: "server_tool_result" as const,
				callId: block.tool_use_id,
				content: block.content,
			};
	}
};

const encodeContentBlock = (block: WideContentBlock): AnthropicResponseContentBlockT => {
	switch (block.type) {
		case "text":
			return {
				type: "text" as const,
				text: block.text,
				...(block.annotations && {
					citations: block.annotations
						.filter((a): a is UnifiedAnnotation => a.type !== "file")
						.map((a: UnifiedAnnotation): AnthropicCitation => {
							switch (a.type) {
								case "url":
									return {
										type: "web_search_result_location" as const,
										cited_text: a.citedText ?? "",
										title: a.title ?? "",
										url: a.url,
										encrypted_index: "",
									};
								case "document":
									return {
										type: "char_location" as const,
										cited_text: a.citedText,
										document_index: a.documentIndex,
										document_title: a.documentTitle,
										start_char_index: 0,
										end_char_index: 0,
									};
							}
						}),
				}),
			};
		case "tool_call":
			return {
				type: "tool_use" as const,
				id: block.callId,
				name: block.name,
				input: block.input,
			};
		case "server_tool_call":
			return {
				type: "server_tool_use" as const,
				id: block.callId,
				name: block.name,
				input: block.input,
			};
		case "reasoning":
			return {
				type: "thinking" as const,
				thinking: block.text,
				signature: block.signature ?? "",
			};
		case "redacted_reasoning":
			return {
				type: "redacted_thinking" as const,
				data: block.data,
			};
		case "compaction":
			return {
				type: "compaction" as const,
				content: block.summary,
			};
		case "server_tool_result":
			return {
				type: "tool_search_tool_result" as const,
				tool_use_id: block.callId,
				content: block.content,
			};
		case "shell_call":
			return {
				type: "tool_use" as const,
				id: block.callId,
				name: "bash",
				input: {
					...(block.commands.length > 0 ? { command: block.commands.join(" && ") } : {}),
					...(block.restart ? { restart: true } : {}),
				},
			};
	}
};

export const ContentBlockCodec = Schema.transform(AnthropicResponseContentBlock, WideContentBlock, {
	decode: decodeContentBlock,
	encode: encodeContentBlock,
});

export const decodeUsage = (a: typeof AnthropicMessagesUsage.Type): TokenUsage => ({
	input: a.input_tokens,
	output: a.output_tokens,
	cacheRead: a.cache_read_input_tokens,
	cacheWrite: a.cache_creation_input_tokens,
	total: a.input_tokens + a.output_tokens,
});

export const decodeStopReason = (
	r: AnthropicStopReason | null,
): Either.Either<StopReason, LLMError> => {
	if (r === null) return Either.right("end_turn");
	switch (r) {
		case "max_tokens":
			return Either.left(
				new ContextLengthError({ message: "Output truncated: max tokens reached" }),
			);
		case "refusal":
			return Either.left(new ContentPolicyError({ message: "Content filtered by provider" }));
		case "pause_turn":
			return Either.right("end_turn");
		default:
			return Either.right(r);
	}
};

export const decodeError = (statusCode: number, body: unknown): LLMError => {
	const message =
		body && typeof body === "object" && "error" in body
			? ((body as { error: { message?: string } }).error.message ?? "Unknown error")
			: "Unknown error";

	const errorType =
		body && typeof body === "object" && "error" in body
			? ((body as { error: { type?: string } }).error.type ?? "")
			: "";

	switch (statusCode) {
		case 400:
			if (errorType === "invalid_request_error" && message.includes("context")) {
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
		case 413:
			return new ContextLengthError({ message });
		case 429:
			return new RateLimitError({ message });
		case 529:
			return new ProviderError({
				message,
				provider: "anthropic",
				statusCode,
				...(errorType ? { code: errorType } : {}),
			});
		default:
			return new ProviderError({
				message,
				provider: "anthropic",
				statusCode,
				...(errorType ? { code: errorType } : {}),
			});
	}
};

const encodeMediaSource = (
	source: { type: "base64"; data: string; mediaType: string } | { type: "url"; url: string },
) => {
	if (source.type === "base64") {
		return {
			type: "base64" as const,
			media_type: source.mediaType as "image/jpeg",
			data: source.data,
		};
	}
	return { type: "url" as const, url: source.url };
};

export const encodeUserContentBlock = (block: UserContentBlock): AnthropicContentBlock | null => {
	switch (block.type) {
		case "text":
			return { type: "text" as const, text: block.text };
		case "image":
			return { type: "image" as const, source: encodeMediaSource(block.source) };
		case "document":
			return {
				type: "document" as const,
				source: encodeMediaSource(block.source) as
					| { type: "base64"; media_type: "application/pdf"; data: string }
					| { type: "url"; url: string },
				...(block.title ? { title: block.title } : {}),
			};
		case "audio":
		case "video":
			return null;
		case "tool_result":
			return {
				type: "tool_result" as const,
				tool_use_id: block.callId,
				content:
					typeof block.output === "string"
						? block.output
						: block.output.map((b) => {
								if (b.type === "text") return { type: "text" as const, text: b.text };
								if (b.type === "image")
									return { type: "image" as const, source: encodeMediaSource(b.source) };
								return { type: "text" as const, text: "" };
							}),
				...(block.isError ? { is_error: true } : {}),
			};
		case "server_tool_result":
			return {
				type: "tool_result" as const,
				tool_use_id: block.callId,
				content: block.content as string,
			};
		case "shell_result": {
			const parts: string[] = [];
			if (block.stdout) parts.push(block.stdout);
			if (block.stderr) parts.push(`stderr:\n${block.stderr}`);
			if (block.timedOut) parts.push("(timed out)");
			parts.push(`exit code: ${block.exitCode}`);
			return {
				type: "tool_result" as const,
				tool_use_id: block.callId,
				content: parts.join("\n"),
				...(block.exitCode !== 0 || block.timedOut ? { is_error: true } : {}),
			};
		}
	}
};

export const encodeMessages = (
	messages: Message[],
): { system?: string; messages: AnthropicMessage[] } => {
	const systemParts: string[] = [];
	const encoded: AnthropicMessage[] = [];

	for (const msg of messages) {
		switch (msg.role) {
			case "system":
				systemParts.push(msg.content);
				break;
			case "user": {
				if (typeof msg.content === "string") {
					encoded.push({ role: "user", content: msg.content });
				} else {
					const blocks = msg.content
						.map(encodeUserContentBlock)
						.filter((b): b is AnthropicContentBlock => b !== null);
					encoded.push({ role: "user", content: blocks });
				}
				break;
			}
			case "assistant":
				encoded.push({
					role: "assistant",
					content: msg.content.map(encodeContentBlock),
				});
				break;
		}
	}

	return {
		...(systemParts.length > 0 ? { system: systemParts.join("\n") } : {}),
		messages: encoded,
	};
};

export const encodeTool = (tool: Tool): AnthropicToolT | null => {
	switch (tool.type) {
		case "function":
			if (tool.name === "bash") {
				return {
					type: "bash_20250124" as const,
					name: "bash" as const,
				};
			}
			return {
				type: "custom" as const,
				name: tool.name,
				...(tool.description ? { description: tool.description } : {}),
				input_schema: {
					type: "object" as const,
					...(tool.parameters ? { properties: tool.parameters } : {}),
				},
				...(tool.strict !== undefined ? { strict: tool.strict } : {}),
				...(tool.deferLoading !== undefined ? { defer_loading: tool.deferLoading } : {}),
			};
		case "web_search":
			return {
				type: "web_search_20250305" as const,
				name: "web_search" as const,
				...(tool.maxUses !== undefined ? { max_uses: tool.maxUses } : {}),
				...(tool.allowedDomains ? { allowed_domains: tool.allowedDomains } : {}),
				...(tool.blockedDomains ? { blocked_domains: tool.blockedDomains } : {}),
				...(tool.userLocation
					? {
							user_location: {
								type: "approximate" as const,
								...(tool.userLocation.city ? { city: tool.userLocation.city } : {}),
								...(tool.userLocation.region ? { region: tool.userLocation.region } : {}),
								...(tool.userLocation.country ? { country: tool.userLocation.country } : {}),
								...(tool.userLocation.timezone ? { timezone: tool.userLocation.timezone } : {}),
							},
						}
					: {}),
			};
		case "code_execution":
			return {
				type: "code_execution_20260120" as const,
				name: "code_execution" as const,
			};
		case "computer_use":
			return {
				type: "computer_20250124" as const,
				name: "computer" as const,
				display_width_px: tool.displayWidth ?? 1024,
				display_height_px: tool.displayHeight ?? 768,
			};
		case "file_search":
		case "mcp":
			return null;
	}
};

export const encodeToolChoice = (choice: ToolChoice): AnthropicToolChoiceT => {
	switch (choice.type) {
		case "auto":
			return { type: "auto" };
		case "any":
			return { type: "any" };
		case "none":
			return { type: "none" };
		case "tool":
			return { type: "tool", name: choice.name };
	}
};

export const encodeThinkingConfig = (config: ThinkingConfig): AnthropicThinkingConfigT => {
	switch (config.type) {
		case "enabled":
			return {
				type: "enabled",
				budget_tokens: config.budgetTokens ?? 10000,
				...(config.display ? { display: config.display } : {}),
			};
		case "disabled":
			return { type: "disabled" };
		case "adaptive":
			return {
				type: "adaptive",
				...(config.display ? { display: config.display } : {}),
			};
	}
};

export const encodeOutputFormat = (
	format: OutputFormat,
): { format: { type: "json_schema"; schema: Record<string, unknown> } } | undefined => {
	switch (format.type) {
		case "text":
			return undefined;
		case "json_object":
			return { format: { type: "json_schema" as const, schema: {} } };
		case "json_schema":
			return { format: { type: "json_schema" as const, schema: format.schema } };
	}
};

export const encodeContextManagement = (
	cm: ContextManagement,
):
	| {
			edits: Array<{
				type: "compact_20260112";
				trigger?: { type: "input_tokens"; value: number };
				instructions?: string;
			}>;
	  }
	| undefined => {
	if (!cm.compaction?.enabled) return undefined;
	return {
		edits: [
			{
				type: "compact_20260112" as const,
				...(cm.compaction.threshold
					? { trigger: { type: "input_tokens" as const, value: cm.compaction.threshold } }
					: {}),
				...(cm.compaction.instructions ? { instructions: cm.compaction.instructions } : {}),
			},
		],
	};
};

export const encodeRequest = (params: {
	model: string;
	messages: Message[];
	maxTokens?: number;
	tools?: Tool[];
	toolChoice?: ToolChoice;
	thinking?: ThinkingConfig;
	outputFormat?: OutputFormat;
	contextManagement?: ContextManagement;
	temperature?: number;
	topP?: number;
	topK?: number;
	stopSequences?: string[];
	stream?: boolean;
}): AnthropicMessagesRequest => {
	const { system, messages } = encodeMessages(params.messages);

	const mcpTools = params.tools?.filter((t) => t.type === "mcp") ?? [];
	const nonMcpTools = params.tools?.map(encodeTool).filter((t): t is AnthropicToolT => t !== null);

	const mcpServers =
		mcpTools.length > 0
			? mcpTools.map((t) => ({
					type: "url" as const,
					name: t.name,
					url: t.url,
					...(t.headers ? { authorization_token: Object.values(t.headers)[0] } : {}),
					...(t.allowedTools ? { tool_configuration: { allowed_tools: t.allowedTools } } : {}),
				}))
			: undefined;

	return {
		model: params.model,
		messages,
		...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
		...(system ? { system } : {}),
		...(nonMcpTools && nonMcpTools.length > 0 ? { tools: nonMcpTools } : {}),
		...(params.toolChoice ? { tool_choice: encodeToolChoice(params.toolChoice) } : {}),
		...(params.thinking ? { thinking: encodeThinkingConfig(params.thinking) } : {}),
		...(params.outputFormat ? { output_config: encodeOutputFormat(params.outputFormat) } : {}),
		...(params.contextManagement
			? { context_management: encodeContextManagement(params.contextManagement) }
			: {}),
		...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
		...(params.topP !== undefined ? { top_p: params.topP } : {}),
		...(params.topK !== undefined ? { top_k: params.topK } : {}),
		...(params.stopSequences ? { stop_sequences: params.stopSequences } : {}),
		...(params.stream !== undefined ? { stream: params.stream } : {}),
		...(mcpServers ? { mcp_servers: mcpServers } : {}),
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
	const toolCalls = new Map<number, { callId: string; name: string; argsBuffer: string }>();
	let inputTokens = 0;
	let cacheReadTokens: number | undefined;
	let cacheWriteTokens: number | undefined;
	let lastStopReason: StopReason | undefined;
	let lastUsage: TokenUsage | undefined;
	let lastError: LLMError | undefined;

	return (rawEvent: unknown): StreamEvent[] => {
		const event = Schema.decodeUnknownSync(AnthropicStreamEvent)(rawEvent);

		switch (event.type) {
			case "message_start": {
				const u = event.message.usage;
				inputTokens = u.input_tokens;
				cacheReadTokens = u.cache_read_input_tokens;
				cacheWriteTokens = u.cache_creation_input_tokens;
				return [{ type: "response.start" as const }];
			}

			case "content_block_start": {
				const decoded = decodeContentBlock(event.content_block);

				if (decoded.type === "tool_call") {
					toolCalls.set(event.index, {
						callId: decoded.callId,
						name: decoded.name,
						argsBuffer: "",
					});
				} else if (decoded.type === "server_tool_call") {
					toolCalls.set(event.index, {
						callId: decoded.callId,
						name: decoded.name,
						argsBuffer: "",
					});
				}

				const contentBlock = ASSISTANT_BLOCK_TYPES.has(decoded.type)
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

			case "content_block_delta": {
				switch (event.delta.type) {
					case "text_delta":
						return [
							{
								type: "content.delta" as const,
								index: event.index,
								delta: { type: "text_delta" as const, text: event.delta.text },
							},
						];
					case "thinking_delta":
						return [
							{
								type: "content.delta" as const,
								index: event.index,
								delta: {
									type: "reasoning_delta" as const,
									text: event.delta.thinking,
								},
							},
						];
					case "input_json_delta": {
						const tc = toolCalls.get(event.index);
						if (tc) {
							tc.argsBuffer += event.delta.partial_json;
						}
						return [];
					}
					case "signature_delta":
						return [
							{
								type: "content.delta" as const,
								index: event.index,
								delta: {
									type: "signature_delta" as const,
									signature: event.delta.signature,
								},
							},
						];
					case "compaction_delta":
						return [
							{
								type: "content.delta" as const,
								index: event.index,
								delta: {
									type: "compaction_delta" as const,
									summary: event.delta.summary,
								},
							},
						];
					case "citations_delta":
						return [];
				}
				break;
			}

			case "content_block_stop": {
				const tc = toolCalls.get(event.index);
				if (tc) {
					toolCalls.delete(event.index);
					let input: Record<string, unknown> = {};
					try {
						input = JSON.parse(tc.argsBuffer || "{}");
					} catch {
						input = { _raw: tc.argsBuffer };
					}
					return [
						{
							type: "content.delta" as const,
							index: event.index,
							delta: {
								type: "tool_call_end" as const,
								callId: tc.callId,
								name: tc.name,
								input,
							},
						},
						{ type: "content.stop" as const, index: event.index },
					];
				}
				return [{ type: "content.stop" as const, index: event.index }];
			}

			case "message_delta": {
				lastUsage = {
					input: inputTokens,
					output: event.usage.output_tokens,
					cacheRead: event.usage.cache_read_input_tokens ?? cacheReadTokens,
					cacheWrite: event.usage.cache_creation_input_tokens ?? cacheWriteTokens,
					total: inputTokens + event.usage.output_tokens,
				};
				const result = decodeStopReason(event.delta.stop_reason);
				if (Either.isRight(result)) {
					lastStopReason = result.right;
				} else {
					lastError = result.left;
				}
				return [];
			}

			case "message_stop": {
				if (lastError) {
					return [
						{
							type: "error" as const,
							error: {
								type: "error" as const,
								code: lastError._tag,
								message: lastError.message,
							},
						},
					];
				}
				return [
					{
						type: "response.complete" as const,
						stopReason: lastStopReason,
						usage: lastUsage,
					},
				];
			}

			case "ping":
				return [];

			case "error":
				return [
					{
						type: "error" as const,
						error: {
							type: "error" as const,
							code: event.error.type,
							message: event.error.message,
						},
					},
				];
		}

		return [];
	};
};
