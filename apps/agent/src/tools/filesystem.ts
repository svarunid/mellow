import { Data, Effect, Schema } from "effect";
import { Sandbox } from "@mellow/sandbox";
import { ExecutableTool, type ToolError } from "../services/tool-registry";

export class FileNotFoundError
	extends Data.TaggedError("FileNotFoundError")<{
		readonly path: string;
	}>
	implements ToolError
{
	transform() {
		return `File not found: ${this.path}`;
	}
}

export class FileWriteError
	extends Data.TaggedError("FileWriteError")<{
		readonly path: string;
		readonly reason: string;
	}>
	implements ToolError
{
	transform() {
		return `Failed to write ${this.path}: ${this.reason}`;
	}
}

export class EditMatchError
	extends Data.TaggedError("EditMatchError")<{
		readonly path: string;
		readonly search: string;
		readonly matchCount: number;
	}>
	implements ToolError
{
	transform() {
		return this.matchCount === 0
			? `No match found for the search string in ${this.path}. Read the file first to verify exact content.`
			: `Found ${this.matchCount} matches in ${this.path}. Provide more surrounding context to make the match unique.`;
	}
}

const ReadFileSchema = Schema.Struct({
	path: Schema.String.annotations({
		description: "Absolute or relative path of the file to read.",
	}),
	offset: Schema.optional(
		Schema.Int.pipe(Schema.positive()).annotations({
			description: "Line number to start reading from (0-based).",
		}),
	),
	limit: Schema.optional(
		Schema.Int.pipe(Schema.positive()).annotations({
			description: "Maximum number of lines to read.",
		}),
	),
});

const WriteFileSchema = Schema.Struct({
	path: Schema.String.annotations({
		description: "Absolute or relative path of the file to write.",
	}),
	content: Schema.String.annotations({
		description: "The content to write to the file.",
	}),
});

const EditFileSchema = Schema.Struct({
	path: Schema.String.annotations({
		description: "Absolute or relative path of the file to edit.",
	}),
	search: Schema.String.annotations({
		description: "The exact string to find in the file. Must match exactly once.",
	}),
	replace: Schema.String.annotations({
		description: "The string to replace the search match with.",
	}),
});

const ListDirectorySchema = Schema.Struct({
	path: Schema.String.annotations({
		description: "Absolute or relative path of the directory to list.",
	}),
});

const GlobSchema = Schema.Struct({
	pattern: Schema.String.annotations({
		description: 'Glob pattern to match files (e.g. "**/*.ts").',
	}),
	path: Schema.optional(
		Schema.String.annotations({
			description: "Base directory to search from. Defaults to workspace root.",
		}),
	),
});

const GrepSchema = Schema.Struct({
	pattern: Schema.String.annotations({
		description: "Regex pattern to search for in file contents.",
	}),
	path: Schema.optional(
		Schema.String.annotations({
			description: "Directory or file to search in. Defaults to workspace root.",
		}),
	),
	include: Schema.optional(
		Schema.String.annotations({
			description: 'File glob to filter (e.g. "*.ts").',
		}),
	),
});

export const readFile = ExecutableTool.make({
	name: "read_file",
	description: "Read the contents of a file at the given path.",
	schema: ReadFileSchema,
	execute: (params) =>
		Effect.gen(function* () {
			const sbx = yield* Sandbox;
			const content = yield* sbx.files.readText(params.path);
			const lines = content.split("\n");
			const start = params.offset ?? 0;
			const sliced = params.limit ? lines.slice(start, start + params.limit) : lines.slice(start);
			return sliced.join("\n");
		}),
});

export const writeFile = ExecutableTool.make({
	name: "write_file",
	description: "Write content to a file at the given path. Creates parent directories if needed.",
	schema: WriteFileSchema,
	execute: (params) =>
		Effect.gen(function* () {
			const sbx = yield* Sandbox;
			const dir = params.path.substring(0, params.path.lastIndexOf("/"));
			if (dir) {
				yield* sbx.directories.create([dir]);
			}
			yield* sbx.files.write(params.path, params.content);
			return `Wrote ${params.content.length} bytes to ${params.path}`;
		}),
});

export const editFile = ExecutableTool.make({
	name: "edit_file",
	description:
		"Replace an exact string match in a file. The search string must match exactly once.",
	schema: EditFileSchema,
	execute: (params) =>
		Effect.gen(function* () {
			const sbx = yield* Sandbox;
			const content = yield* sbx.files.readText(params.path);
			const occurrences = content.split(params.search).length - 1;
			if (occurrences !== 1) {
				return yield* new EditMatchError({
					path: params.path,
					search: params.search,
					matchCount: occurrences,
				});
			}
			const updated = content.replace(params.search, params.replace);
			yield* sbx.files.write(params.path, updated);
			return `Edited ${params.path}: replaced 1 occurrence`;
		}),
});

export const listDirectory = ExecutableTool.make({
	name: "list_directory",
	description: "List the contents of a directory.",
	schema: ListDirectorySchema,
	execute: (params) =>
		Effect.gen(function* () {
			const sbx = yield* Sandbox;
			const result = yield* sbx.commands.exec(`ls -la ${params.path}`);
			return result.stdout;
		}),
});

export const glob = ExecutableTool.make({
	name: "glob",
	description: "Find files matching a glob pattern.",
	schema: GlobSchema,
	execute: (params) =>
		Effect.gen(function* () {
			const sbx = yield* Sandbox;
			const dir = params.path ?? ".";
			const result = yield* sbx.commands.exec(`find ${dir} -name '${params.pattern}' -type f`);
			return result.stdout;
		}),
});

export const grep = ExecutableTool.make({
	name: "grep",
	description: "Search file contents for a regex pattern.",
	schema: GrepSchema,
	execute: (params) =>
		Effect.gen(function* () {
			const sbx = yield* Sandbox;
			const dir = params.path ?? ".";
			const includeFlag = params.include ? `--include='${params.include}'` : "";
			const result = yield* sbx.commands.exec(
				`grep -rn ${includeFlag} '${params.pattern}' ${dir} || true`,
			);
			return result.stdout;
		}),
});
