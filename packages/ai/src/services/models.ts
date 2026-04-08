import { FetchHttpClient, HttpClient, HttpClientRequest } from "@effect/platform";
import { Effect, Ref, Schema } from "effect";

export const Modality = Schema.Literal("text", "image", "audio", "video", "pdf");
export type Modality = typeof Modality.Type;

export const Cost = Schema.Struct({
	input: Schema.Number,
	output: Schema.Number,
	reasoning: Schema.optional(Schema.Number),
	cacheRead: Schema.optional(Schema.Number),
	cacheWrite: Schema.optional(Schema.Number),
});
export type Cost = typeof Cost.Type;

export const Limit = Schema.Struct({
	context: Schema.Int,
	output: Schema.Int,
	input: Schema.optional(Schema.Int),
});
export type Limit = typeof Limit.Type;

export const Model = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	family: Schema.String,
	input: Schema.Array(Modality),
	cost: Cost,
	limit: Limit,
});
export type Model = typeof Model.Type;

export const Provider = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	models: Schema.Record({ key: Schema.String, value: Model }),
});
export type Provider = typeof Provider.Type;

const PROVIDERS: ReadonlyArray<{ readonly id: string; readonly name: string }> = [
	{ id: "anthropic", name: "Anthropic" },
	{ id: "openai", name: "OpenAI" },
	{ id: "google", name: "Google" },
];

export class ModelStore extends Effect.Service<ModelStore>()("ai/ModelStore", {
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;
		const store = yield* Ref.make<Record<string, Provider>>({});

		const load = Effect.gen(function* () {
			const request = HttpClientRequest.get("https://models.dev/api.json");
			const response = yield* httpClient.execute(request);
			const data = (yield* response.json) as Record<string, any>;

			const providers: Record<string, Provider> = {};
			for (const provider of PROVIDERS) {
				const raw = data[provider.id];
				if (!raw?.models) continue;

				const models: Record<string, Model> = {};
				for (const [, model] of Object.entries(raw.models)) {
					const m = model as Record<string, any>;
					models[m.id] = {
						id: m.id,
						name: m.name,
						family: m.family ?? m.id.split("-").slice(0, -1).join("-"),
						input: m.input ?? ["text"],
						cost: {
							input: m.cost.input,
							output: m.cost.output,
							reasoning: m.cost.reasoning,
							cacheRead: m.cost.cache_read,
							cacheWrite: m.cost.cache_write,
						},
						limit: m.limit,
					};
				}
				providers[provider.id] = { id: provider.id, name: provider.name, models };
			}
			yield* Ref.set(store, providers);
		}).pipe(
			Effect.scoped,
			Effect.orElseSucceed(() => {}),
		);

		yield* load;

		return {
			get: (provider: string, model: string) =>
				Ref.get(store).pipe(Effect.map((providers) => providers[provider]?.models[model])),
		};
	}),
	dependencies: [FetchHttpClient.layer],
}) {}
