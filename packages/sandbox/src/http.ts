import { Effect, Schema } from "effect";
import type { HttpClient, HttpClientRequest } from "@effect/platform";

export const makeHttpExecutor = (httpClient: HttpClient.HttpClient) => ({
	json: <A, I>(req: HttpClientRequest.HttpClientRequest, schema: Schema.Schema<A, I>) =>
		Effect.gen(function* () {
			const response = yield* httpClient.execute(req);
			const raw = yield* response.json;
			return yield* Schema.decodeUnknown(schema)(raw);
		}).pipe(Effect.scoped),

	void: (req: HttpClientRequest.HttpClientRequest) =>
		Effect.gen(function* () {
			yield* httpClient.execute(req);
		}).pipe(Effect.scoped),

	text: (req: HttpClientRequest.HttpClientRequest) =>
		Effect.gen(function* () {
			const response = yield* httpClient.execute(req);
			return yield* response.text;
		}).pipe(Effect.scoped),
});
