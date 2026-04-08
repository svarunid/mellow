import { Data, Effect, Stream } from "effect";
import { LLM } from "@mellow/ai";
import type { LLMError } from "@mellow/ai/errors";
import type {
	AssistantContentBlock,
	AssistantMessage,
	ContextManagement,
	ImageContent,
	Message,
	StopReason,
	ThinkingConfig,
	ToolCallBlock,
	ToolResultBlock,
	Usage,
	UserMessage,
} from "@mellow/ai/types";
import type { StreamEvent } from "@mellow/ai/types";
import type { Sandbox } from "@mellow/sandbox";
import { EventStream, type EventStreamError } from "@mellow/database/stream";
import ToolRegistry from "./tool-registry";

export class MaxIterationsError extends Data.TaggedError("MaxIterationsError")<{
	readonly iterations: number;
}> {}

export interface EngineInput {
	readonly streamKey: string;
	readonly message: string | ImageContent;
	readonly model: string;
	readonly system?: string;
	readonly maxTokens?: number;
	readonly thinking?: ThinkingConfig;
	readonly contextManagement?: ContextManagement;
	readonly temperature?: number;
	readonly topP?: number;
	readonly topK?: number;
	readonly stopSequences?: string[];
	readonly maxIterations?: number;
}

export interface EngineOutput {
	readonly content: AssistantContentBlock[];
	readonly stopReason: StopReason;
	readonly usage: Usage;
	readonly messages: Message[];
}

interface LoopState {
	readonly messages: Message[];
	readonly content: AssistantContentBlock[];
	readonly stopReason: StopReason;
	readonly usage: Usage;
	readonly iterations: number;
}

interface TurnCollector {
	readonly pending: Map<number, AssistantContentBlock>;
	readonly textBuffers: Map<number, string>;
	readonly reasoningBuffers: Map<number, string>;
	readonly signatureBuffers: Map<number, string>;
	stopReason: StopReason | undefined;
	usage: Usage | undefined;
}

interface TurnResult {
	readonly content: AssistantContentBlock[];
	readonly stopReason: StopReason;
	readonly usage: Usage;
}

const sum = (a?: number, b?: number): number | undefined =>
	a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);

const mergeUsage = (a: Usage, b: Usage): Usage => ({
	inputTokens: a.inputTokens + b.inputTokens,
	outputTokens: a.outputTokens + b.outputTokens,
	cacheReadTokens: sum(a.cacheReadTokens, b.cacheReadTokens),
	cacheWriteTokens: sum(a.cacheWriteTokens, b.cacheWriteTokens),
	reasoningTokens: sum(a.reasoningTokens, b.reasoningTokens),
	totalTokens: sum(a.totalTokens, b.totalTokens),
});

const extractToolCalls = (content: AssistantContentBlock[]): ToolCallBlock[] =>
	content.filter((b): b is ToolCallBlock => b.type === "tool_call");

const processStreamEvent = (collector: TurnCollector, event: StreamEvent): void => {
	switch (event.type) {
		case "content.start":
			if (event.contentBlock) collector.pending.set(event.index, event.contentBlock);
			collector.textBuffers.set(event.index, "");
			collector.reasoningBuffers.set(event.index, "");
			break;

		case "content.delta":
			switch (event.delta.type) {
				case "text_delta":
					collector.textBuffers.set(
						event.index,
						(collector.textBuffers.get(event.index) ?? "") + event.delta.text,
					);
					if (!collector.pending.has(event.index)) {
						collector.pending.set(event.index, { type: "text", text: "" });
					}
					break;
				case "reasoning_delta":
					collector.reasoningBuffers.set(
						event.index,
						(collector.reasoningBuffers.get(event.index) ?? "") + event.delta.text,
					);
					if (!collector.pending.has(event.index)) {
						collector.pending.set(event.index, { type: "reasoning", text: "" });
					}
					break;
				case "signature_delta":
					collector.signatureBuffers.set(
						event.index,
						(collector.signatureBuffers.get(event.index) ?? "") + event.delta.signature,
					);
					break;
				case "tool_call_end":
					collector.pending.set(event.index, {
						type: "tool_call",
						callId: event.delta.callId,
						name: event.delta.name,
						input: event.delta.input,
					});
					break;
				case "compaction_delta":
					collector.pending.set(event.index, {
						type: "compaction",
						summary: event.delta.summary,
					});
					break;
			}
			break;

		case "content.stop": {
			const block = collector.pending.get(event.index);
			if (!block) break;

			const textBuffer = collector.textBuffers.get(event.index);
			const reasoningBuffer = collector.reasoningBuffers.get(event.index);

			if (block.type === "text" && textBuffer) {
				collector.pending.set(event.index, { type: "text", text: textBuffer });
			} else if (block.type === "reasoning" && reasoningBuffer) {
				collector.pending.set(event.index, {
					type: "reasoning",
					text: reasoningBuffer,
					signature: collector.signatureBuffers.get(event.index),
				});
			}
			break;
		}

		case "response.complete":
			collector.stopReason = event.stopReason;
			collector.usage = event.usage;
			break;
	}
};

export default class Engine extends Effect.Service<Engine>()("@mellow/agent/Engine", {
	effect: Effect.gen(function* () {
		const llm = yield* LLM;
		const registry = yield* ToolRegistry;
		const eventStream = yield* EventStream;

		const collectStreamTurn = (
			stream: Stream.Stream<StreamEvent, LLMError>,
			streamKey: string,
		): Effect.Effect<TurnResult, LLMError | EventStreamError> =>
			Effect.gen(function* () {
				const collector = {
					pending: new Map(),
					textBuffers: new Map(),
					reasoningBuffers: new Map(),
					signatureBuffers: new Map(),
					stopReason: undefined,
					usage: undefined,
				};

				yield* Stream.runForEach(stream, (event) =>
					Effect.gen(function* () {
						yield* eventStream.publish(streamKey, event);
						processStreamEvent(collector, event);
					}),
				);

				return {
					content: Array.from(collector.pending.entries())
						.sort(([a], [b]) => a - b)
						.map(([, block]) => block),
					stopReason: collector.stopReason ?? "end_turn",
					usage: collector.usage ?? { inputTokens: 0, outputTokens: 0 },
				};
			});

		const run = (
			input: EngineInput,
		): Effect.Effect<EngineOutput, LLMError | MaxIterationsError | EventStreamError, Sandbox> =>
			Effect.gen(function* () {
				const maxIterations = input.maxIterations ?? 50;

				const userMsg: UserMessage =
					typeof input.message === "string"
						? { role: "user", content: input.message }
						: { role: "user", content: [input.message] };

				const systemMsg: Message | undefined = input.system
					? { role: "system" as const, content: input.system }
					: undefined;

				const tools = yield* registry.tools();

				const buildMessages = (msgs: Message[]): Message[] =>
					systemMsg ? [systemMsg, ...msgs] : msgs;

				const params = {
					model: input.model,
					maxTokens: input.maxTokens,
					tools,
					thinking: input.thinking,
					contextManagement: input.contextManagement,
					temperature: input.temperature,
					topP: input.topP,
					topK: input.topK,
					stopSequences: input.stopSequences,
				};

				const firstStream = yield* llm.stream({
					...params,
					messages: buildMessages([userMsg]),
				});

				const first = yield* collectStreamTurn(firstStream, input.streamKey);

				const assistantMsg: AssistantMessage = {
					role: "assistant",
					content: first.content,
				};

				const initial: LoopState = {
					messages: [userMsg, assistantMsg],
					content: first.content,
					stopReason: first.stopReason,
					usage: first.usage,
					iterations: 1,
				};

				const final_ = yield* Effect.iterate(initial, {
					while: (state) => state.stopReason === "tool_use",
					body: (state) =>
						Effect.gen(function* () {
							if (state.iterations >= maxIterations) {
								return yield* new MaxIterationsError({
									iterations: state.iterations,
								});
							}

							const toolCalls = extractToolCalls(state.content);

							const toolResults = yield* Effect.all(
								toolCalls.map((call) =>
									registry
										.execute(call.name, call.callId, call.input as Record<string, unknown>)
										.pipe(
											Effect.catchTag("ToolNotFoundError", (e) =>
												Effect.succeed<ToolResultBlock>({
													type: "tool_result",
													callId: call.callId,
													output: `Tool "${e.name}" not found`,
													isError: true,
												}),
											),
										),
								),
								{ concurrency: "unbounded" },
							);

							const toolResultMsg: UserMessage = {
								role: "user",
								content: toolResults,
							};

							const updatedMessages = [...state.messages, toolResultMsg];

							const nextStream = yield* llm.stream({
								...params,
								messages: buildMessages(updatedMessages),
							});

							const result = yield* collectStreamTurn(nextStream, input.streamKey);

							const nextAssistantMsg: AssistantMessage = {
								role: "assistant",
								content: result.content,
							};

							return {
								messages: [...updatedMessages, nextAssistantMsg],
								content: result.content,
								stopReason: result.stopReason,
								usage: mergeUsage(state.usage, result.usage),
								iterations: state.iterations + 1,
							};
						}),
				});

				return {
					content: final_.content,
					stopReason: final_.stopReason,
					usage: final_.usage,
					messages: final_.messages,
				};
			});

		return { run };
	}),
	dependencies: [ToolRegistry.Default],
}) {}
