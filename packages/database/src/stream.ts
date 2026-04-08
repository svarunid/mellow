import { Context, Data, Effect, Layer, Stream } from "effect";
import type Redis from "ioredis";

export class EventStreamError extends Data.TaggedError("EventStreamError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export interface EventStreamEntry<T = unknown> {
	readonly id: string;
	readonly data: T;
}

type EventStreamService = {
	readonly publish: <T>(key: string, data: T) => Effect.Effect<string, EventStreamError>;
	readonly subscribe: <T>(
		key: string,
		options?: { lastId?: string; count?: number; blockMs?: number },
	) => Stream.Stream<EventStreamEntry<T>, EventStreamError>;
};

export class EventStream extends Context.Tag("@mellow/database/EventStream")<
	EventStream,
	EventStreamService
>() {
	static make(redis: Redis) {
		const publish = <T>(key: string, data: T): Effect.Effect<string, EventStreamError> =>
			Effect.tryPromise({
				try: async () => {
					const id = await redis.xadd(key, "*", "data", JSON.stringify(data));
					if (!id) throw new Error("XADD returned null");
					return id;
				},
				catch: (e) => new EventStreamError({ message: "Failed to publish to stream", cause: e }),
			});

		const subscribe = <T>(
			key: string,
			options?: { lastId?: string; count?: number; blockMs?: number },
		): Stream.Stream<EventStreamEntry<T>, EventStreamError> => {
			const count = options?.count ?? 100;
			const blockMs = options?.blockMs ?? 5000;

			return Stream.asyncScoped<EventStreamEntry<T>, EventStreamError>((emit) =>
				Effect.acquireRelease(
					Effect.sync(() => {
						const sub = redis.duplicate();
						let currentId = options?.lastId ?? "$";
						let running = true;

						const poll = async () => {
							while (running) {
								try {
									const results = await sub.xread(
										"COUNT",
										count,
										"BLOCK",
										blockMs,
										"STREAMS",
										key,
										currentId,
									);
									if (results) {
										for (const [, entries] of results) {
											for (const [entryId, fields] of entries) {
												const data = JSON.parse(fields[1]) as T;
												emit.single({ id: entryId, data });
												currentId = entryId;
											}
										}
									}
								} catch (e) {
									if (running) {
										emit.fail(
											new EventStreamError({
												message: "Failed to read from stream",
												cause: e,
											}),
										);
									}
									return;
								}
							}
						};

						poll();
						return {
							sub,
							stop: () => {
								running = false;
							},
						};
					}),
					({ sub, stop }) =>
						Effect.sync(() => {
							stop();
							sub.disconnect();
						}),
				).pipe(Effect.map(() => {})),
			);
		};

		return Layer.succeed(EventStream, { publish, subscribe });
	}
}
