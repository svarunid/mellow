import { Config, Effect, Either, JSONSchema, Layer, Redacted, Schema, Stream } from "effect";
import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
	HttpClientResponse,
} from "@effect/platform";
import {
	LLM,
	type GenerateTextParams,
	type GenerateTextResult,
	type GenerateObjectParams,
	type GenerateObjectResult,
	type StreamParams,
} from "../service";
import {
	decodeOutputItem,
	decodeUsage,
	decodeStopReason,
	decodeError,
	encodeRequest,
	createStreamDecoder,
} from "./codec";
import { OpenAIResponsesResponse, type OpenAIResponsesUsage } from "./types";
import { parseSSE } from "../../../utils/sse";
import { InputValidationError, ProviderError, type LLMError } from "../../../errors";
import type { AssistantContentBlock } from "../../../types/message";
import type { StreamEvent } from "../../../types/stream";

const ASSISTANT_BLOCK_TYPES = new Set([
	"text",
	"tool_call",
	"server_tool_call",
	"reasoning",
	"redacted_reasoning",
	"compaction",
]);

export namespace OpenAI {
	export interface Overrides {
		readonly apiKey?: string | undefined;
		readonly baseUrl?: string | undefined;
	}

	export const make = (overrides?: Overrides) =>
		Layer.effect(
			LLM,
			Effect.gen(function* () {
				const httpClient = yield* HttpClient.HttpClient;

				const envApiKey = yield* Config.redacted("OPENAI_API_KEY").pipe(
					Config.map((r) => Redacted.value(r)),
					Config.withDefault(""),
				);
				const envBaseUrl = yield* Config.string("OPENAI_BASE_URL").pipe(
					Config.withDefault("https://api.openai.com"),
				);

				const apiKey = overrides?.apiKey ?? envApiKey;
				const baseUrl = overrides?.baseUrl ?? envBaseUrl;

				const buildRequest = (body: unknown) =>
					HttpClientRequest.post(`${baseUrl}/v1/responses`).pipe(
						HttpClientRequest.setHeader("authorization", `Bearer ${apiKey}`),
						HttpClientRequest.setHeader("content-type", "application/json"),
						HttpClientRequest.bodyUnsafeJson(body),
					);

				const mapHttpError = (e: unknown): LLMError => {
					if (typeof e === "object" && e !== null && "_tag" in e) {
						return e as LLMError;
					}
					return new ProviderError({
						message: e instanceof Error ? e.message : "HTTP request failed",
						provider: "openai",
						cause: e,
					});
				};

				const executeJson = (body: unknown) =>
					Effect.gen(function* () {
						const request = buildRequest(body);
						const response = yield* httpClient.execute(request);
						if (response.status >= 400) {
							const errorBody = yield* response.json.pipe(Effect.orElseSucceed(() => ({})));
							return yield* Effect.fail(decodeError(response.status, errorBody));
						}
						return yield* response.json;
					}).pipe(Effect.scoped, Effect.mapError(mapHttpError));

				const buildParams = (params: GenerateTextParams, stream: boolean) => {
					const base: Record<string, unknown> = {
						model: params.model,
						messages: params.messages,
						stream,
					};
					if (params.maxTokens !== undefined) base.maxOutputTokens = params.maxTokens;
					if (params.tools !== undefined) base.tools = params.tools;
					if (params.toolChoice !== undefined) base.toolChoice = params.toolChoice;
					if (params.thinking !== undefined) base.thinking = params.thinking;
					if (params.contextManagement !== undefined)
						base.contextManagement = params.contextManagement;
					if (params.temperature !== undefined) base.temperature = params.temperature;
					if (params.topP !== undefined) base.topP = params.topP;
					return base as Parameters<typeof encodeRequest>[0];
				};

				const generateText = (
					params: GenerateTextParams,
				): Effect.Effect<GenerateTextResult, LLMError> =>
					Effect.gen(function* () {
						const body = encodeRequest(buildParams(params, false));
						const raw = yield* executeJson(body);

						const parsed = yield* Effect.try({
							try: () => Schema.decodeUnknownSync(OpenAIResponsesResponse)(raw),
							catch: (e) =>
								new InputValidationError({
									message: e instanceof Error ? e.message : "Failed to parse response",
								}),
						});

						const content = parsed.output
							.flatMap(decodeOutputItem)
							.filter((b): b is AssistantContentBlock => ASSISTANT_BLOCK_TYPES.has(b.type));

						const usage = parsed.usage
							? decodeUsage(parsed.usage as typeof OpenAIResponsesUsage.Type)
							: { inputTokens: 0, outputTokens: 0 };

						const stopResult = decodeStopReason(parsed);
						if (Either.isLeft(stopResult)) {
							return yield* Effect.fail(stopResult.left);
						}

						return { content, stopReason: stopResult.right, usage };
					});

				const generateObject = <T>(
					params: GenerateObjectParams<T>,
				): Effect.Effect<GenerateObjectResult<T>, LLMError> =>
					Effect.gen(function* () {
						const jsonSchema = JSONSchema.make(params.schema) as unknown as Record<string, unknown>;
						const base = buildParams(params, false);
						base.outputFormat = {
							type: "json_schema" as const,
							name: params.name,
							schema: jsonSchema,
							strict: params.strict,
						};

						const body = encodeRequest(base);
						const raw = yield* executeJson(body);

						const parsed = yield* Effect.try({
							try: () => Schema.decodeUnknownSync(OpenAIResponsesResponse)(raw),
							catch: (e) =>
								new InputValidationError({
									message: e instanceof Error ? e.message : "Failed to parse response",
								}),
						});

						const usage = parsed.usage
							? decodeUsage(parsed.usage as typeof OpenAIResponsesUsage.Type)
							: { inputTokens: 0, outputTokens: 0 };

						const textBlock = parsed.output
							.flatMap(decodeOutputItem)
							.find((b) => b.type === "text");
						if (!textBlock || textBlock.type !== "text") {
							return yield* Effect.fail(
								new InputValidationError({ message: "No text content in response" }),
							);
						}

						const jsonParsed = yield* Effect.try({
							try: () => JSON.parse(textBlock.text),
							catch: () =>
								new InputValidationError({ message: "Failed to parse JSON from response" }),
						});

						const object = yield* Schema.decodeUnknown(params.schema)(jsonParsed).pipe(
							Effect.mapError(
								(e) =>
									new InputValidationError({ message: `Schema validation failed: ${e.message}` }),
							),
						);

						return { object, usage };
					});

				const stream = (
					params: StreamParams,
				): Effect.Effect<Stream.Stream<StreamEvent, LLMError>, LLMError> =>
					Effect.gen(function* () {
						const body = encodeRequest(buildParams(params, true));
						const request = buildRequest(body);
						const decoder = createStreamDecoder();

						const eventStream = HttpClientResponse.stream(
							httpClient.execute(request).pipe(
								Effect.tap((response) => {
									if (response.status >= 400) {
										return response.json.pipe(
											Effect.orElseSucceed(() => ({})),
											Effect.flatMap((errorBody) =>
												Effect.fail(decodeError(response.status, errorBody)),
											),
										);
									}
									return Effect.void;
								}),
								Effect.mapError(mapHttpError),
							),
						).pipe(
							Stream.decodeText(),
							(s) => parseSSE(s),
							Stream.mapConcat((event) => decoder(event) as StreamEvent[]),
							Stream.mapError(
								(e): LLMError =>
									typeof e === "object" && e !== null && "_tag" in e
										? (e as LLMError)
										: new ProviderError({
												message: String(e),
												provider: "openai",
												cause: e,
											}),
							),
						);

						return eventStream;
					});

				return { generateText, generateObject, stream };
			}),
		).pipe(Layer.provide(FetchHttpClient.layer));
}
