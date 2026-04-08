import { Context, Effect, Layer, Option, Ref, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform";

export const ModelInfo = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	reasoning: Schema.Boolean,
	tool_call: Schema.Boolean,
	temperature: Schema.optionalWith(Schema.Boolean, { default: () => true }),
	limit: Schema.Struct({
		context: Schema.Int,
		output: Schema.Int,
		input: Schema.optional(Schema.Int),
	}),
	cost: Schema.Struct({
		input: Schema.Number,
		output: Schema.Number,
		reasoning: Schema.optional(Schema.Number),
		cache_read: Schema.optional(Schema.Number),
		cache_write: Schema.optional(Schema.Number),
	}),
});
export type ModelInfo = typeof ModelInfo.Type;

const SUPPORTED_PROVIDERS = ["anthropic", "openai"] as const;

export class ModelRegistry extends Context.Tag("ai/modelregistry")<
	ModelRegistry,
	{ readonly get: (model: string) => Effect.Effect<ModelInfo | undefined> }
>() {}

export const ModelRegistryLayer = Layer.effect(
	ModelRegistry,
	Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;
		const store = yield* Ref.make<Map<string, ModelInfo>>(new Map());

		const load = Effect.gen(function* () {
			const request = HttpClientRequest.get("https://models.dev/api.json");
			const response = yield* httpClient.execute(request);
			const data = (yield* response.json) as Record<string, any>;

			const registry = new Map<string, ModelInfo>();
			for (const providerId of SUPPORTED_PROVIDERS) {
				const provider = data[providerId];
				if (!provider?.models) continue;
				for (const [modelId, raw] of Object.entries(provider.models)) {
					const parsed = Schema.decodeUnknownOption(ModelInfo)(raw);
					if (Option.isSome(parsed)) registry.set(modelId, parsed.value);
				}
			}
			yield* Ref.set(store, registry);
		}).pipe(
			Effect.scoped,
			Effect.orElseSucceed(() => {}),
		);

		yield* load;

		return {
			get: (model: string) => Ref.get(store).pipe(Effect.map((m) => m.get(model))),
		};
	}),
);

export const ModelRegistryLive = ModelRegistryLayer.pipe(Layer.provide(FetchHttpClient.layer));
