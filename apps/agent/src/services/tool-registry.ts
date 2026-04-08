import { Data, Effect, JSONSchema, Ref, Schema } from "effect";
import type { ToolResultBlock } from "@mellow/ai/types";
import type { Sandbox } from "@mellow/sandbox";
import type { FunctionTool } from "@mellow/ai/types";

export interface ToolError {
	readonly transform: () => string;
}

export const isToolError = (e: unknown): e is ToolError =>
	typeof e === "object" &&
	e !== null &&
	"transform" in e &&
	typeof (e as ToolError).transform === "function";

export class ToolNotFoundError extends Data.TaggedError("ToolNotFoundError")<{
	readonly name: string;
}> {}

export interface ExecutableTool {
	readonly name: string;
	readonly description: string;
	readonly parameters: JSONSchema.JsonSchema7Root;
	readonly execute: (input: Record<string, unknown>) => Effect.Effect<string, unknown, Sandbox>;
}

export const ExecutableTool = {
	make: <S extends Schema.Schema.AnyNoContext>(config: {
		readonly name: string;
		readonly description: string;
		readonly schema: S;
		readonly execute: (params: Schema.Schema.Type<S>) => Effect.Effect<string, unknown, Sandbox>;
	}): ExecutableTool => ({
		name: config.name,
		description: config.description,
		parameters: JSONSchema.make(config.schema),
		execute: (raw) =>
			Schema.decodeUnknown(config.schema)(raw).pipe(
				Effect.mapError(
					(e): ToolError => ({
						transform: () => `Invalid parameters: ${String(e)}`,
					}),
				),
				Effect.flatMap(config.execute),
			),
	}),
};

export default class ToolRegistry extends Effect.Service<ToolRegistry>()(
	"@mellow/agent/ToolRegistry",
	{
		effect: Effect.gen(function* () {
			const store = yield* Ref.make(new Map<string, ExecutableTool>());

			const register = (tool: ExecutableTool) =>
				Ref.update(store, (m) => new Map(m).set(tool.name, tool));

			const tools = () =>
				Ref.get(store).pipe(
					Effect.map((m) =>
						Array.from(m.values()).map(
							(t): FunctionTool => ({
								type: "function",
								name: t.name,
								description: t.description,
								parameters: t.parameters as unknown as Record<string, unknown>,
							}),
						),
					),
				);

			const execute = (
				name: string,
				callId: string,
				input: Record<string, unknown>,
			): Effect.Effect<ToolResultBlock, ToolNotFoundError, Sandbox> =>
				Effect.gen(function* () {
					const all = yield* Ref.get(store);
					const tool = all.get(name);
					if (!tool) return yield* new ToolNotFoundError({ name });

					return yield* tool.execute(input).pipe(
						Effect.map(
							(output): ToolResultBlock => ({
								type: "tool_result",
								callId,
								output,
								isError: false,
							}),
						),
						Effect.catchAll((error) =>
							Effect.succeed<ToolResultBlock>({
								type: "tool_result",
								callId,
								output: isToolError(error) ? error.transform() : String(error),
								isError: true,
							}),
						),
						Effect.catchAllDefect((defect) =>
							Effect.succeed<ToolResultBlock>({
								type: "tool_result",
								callId,
								output: defect instanceof Error ? defect.message : "Internal tool error",
								isError: true,
							}),
						),
					);
				});

			return { register, tools, execute };
		}),
	},
) {}
