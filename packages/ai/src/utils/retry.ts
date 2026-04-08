import { Duration, Effect, Layer } from "effect";
import type { LLMError } from "../errors";
import { LLM } from "../services/llm/service";

export interface RetryOptions {
	readonly maxRetries?: number | undefined;
}

const backoffDelay = (attempt: number) =>
	Math.min(1000 * 2 ** attempt * (0.5 + Math.random() * 0.5), 30000);

const withRetryEffect = <A>(
	effect: Effect.Effect<A, LLMError>,
	maxRetries: number,
): Effect.Effect<A, LLMError> => {
	const loop = (attempt: number): Effect.Effect<A, LLMError> =>
		effect.pipe(
			Effect.catchTags({
				RateLimitError: (error) => {
					if (attempt >= maxRetries) return Effect.fail(error);
					const delayMs = error.retryAfterMs ?? backoffDelay(attempt);
					return Effect.delay(loop(attempt + 1), Duration.millis(delayMs));
				},
				ProviderError: (error) => {
					if (attempt >= maxRetries) return Effect.fail(error);
					return Effect.delay(loop(attempt + 1), Duration.millis(backoffDelay(attempt)));
				},
			}),
		);
	return loop(0);
};

export const withRetry = (options?: RetryOptions) => {
	const maxRetries = options?.maxRetries ?? 3;

	return <E, R>(layer: Layer.Layer<LLM, E, R>): Layer.Layer<LLM, E, R> =>
		Layer.effect(
			LLM,
			Effect.gen(function* () {
				const service = yield* LLM;

				return {
					generateText: (params) => withRetryEffect(service.generateText(params), maxRetries),
					generateObject: (params) => withRetryEffect(service.generateObject(params), maxRetries),
					stream: (params) => withRetryEffect(service.stream(params), maxRetries),
				};
			}),
		).pipe(Layer.provide(layer)) as Layer.Layer<LLM, E, R>;
};
