import { Effect, Schema } from "effect";
import BashExecutor from "../services/bash-executor";
import { ExecutableTool } from "../services/tool-registry";

const BashSchema = Schema.Struct({
	command: Schema.String.annotations({
		description: "The bash command to execute.",
	}),
	timeout: Schema.optional(
		Schema.Int.pipe(Schema.positive()).annotations({
			description: "Timeout in milliseconds. Defaults to 120000.",
		}),
	),
});

export const bash = ExecutableTool.make({
	name: "bash",
	description: "Execute a bash command. Returns stdout, stderr, and exit code.",
	schema: BashSchema,
	execute: (params) =>
		Effect.gen(function* () {
			const executor = yield* BashExecutor;
			const result = yield* executor.run(params.command, {
				timeoutMs: params.timeout,
			});
			const parts: string[] = [];
			if (result.stdout) parts.push(result.stdout);
			if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
			parts.push(`exit code: ${result.exitCode}`);
			return parts.join("\n");
		}).pipe(Effect.provide(BashExecutor.Default)),
});
