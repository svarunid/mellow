import { Effect, Layer } from "effect";
import ToolRegistry from "../services/tool-registry";
import { readFile, writeFile, editFile, listDirectory, glob, grep } from "./filesystem";
import { bash } from "./bash";

export const AllToolsLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const registry = yield* ToolRegistry;
		yield* registry.register(readFile);
		yield* registry.register(writeFile);
		yield* registry.register(editFile);
		yield* registry.register(listDirectory);
		yield* registry.register(glob);
		yield* registry.register(grep);
		yield* registry.register(bash);
	}),
).pipe(Layer.provide(ToolRegistry.Default));
