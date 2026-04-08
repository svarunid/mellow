import { Data, Effect } from "effect";
import { Sandbox, type SandboxError } from "@mellow/sandbox";
import type { ToolError } from "./tool-registry";

const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
	"ls",
	"cat",
	"head",
	"tail",
	"wc",
	"find",
	"tree",
	"file",
	"stat",
	"du",
	"df",
	"mkdir",
	"cp",
	"mv",
	"touch",
	"chmod",
	"chown",
	"ln",
	"rm",
	"grep",
	"rg",
	"ag",
	"sed",
	"awk",
	"sort",
	"uniq",
	"cut",
	"tr",
	"diff",
	"comm",
	"git",
	"npm",
	"npx",
	"yarn",
	"pnpm",
	"bun",
	"bunx",
	"node",
	"deno",
	"python",
	"python3",
	"pip",
	"pip3",
	"uv",
	"uvx",
	"cargo",
	"rustc",
	"go",
	"make",
	"cmake",
	"apt",
	"apt-get",
	"brew",
	"yum",
	"dnf",
	"apk",
	"echo",
	"printf",
	"env",
	"printenv",
	"which",
	"whoami",
	"id",
	"pwd",
	"date",
	"ps",
	"top",
	"kill",
	"xargs",
	"tee",
	"curl",
	"wget",
	"ping",
	"dig",
	"nslookup",
	"ssh",
	"scp",
	"tar",
	"zip",
	"unzip",
	"gzip",
	"gunzip",
	"jq",
	"yq",
]);

export class BashCommandDeniedError
	extends Data.TaggedError("BashCommandDeniedError")<{
		readonly command: string;
		readonly reason: string;
	}>
	implements ToolError
{
	transform() {
		return `'${this.command}' is not allowed to be executed.`;
	}
}

export interface BashResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
	readonly timedOut: boolean;
}

const DEFAULT_TIMEOUT_MS = 120_000;

export default class BashExecutor extends Effect.Service<BashExecutor>()(
	"@mellow/agent/BashExecutor",
	{
		effect: Effect.succeed({
			run: (
				command: string,
				options?: { timeoutMs?: number },
			): Effect.Effect<BashResult, BashCommandDeniedError | SandboxError, Sandbox> =>
				Effect.gen(function* () {
					const executable = command.trim().split(/\s/)[0];
					if (!executable || !ALLOWED_COMMANDS.has(executable)) {
						return yield* new BashCommandDeniedError({
							command: executable ?? "",
							reason: `"${executable}" is not in the allowlist`,
						});
					}

					const timeoutSec = Math.ceil((options?.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000);
					const sbx = yield* Sandbox;
					const result = yield* sbx.commands.exec(command, { timeoutSeconds: timeoutSec });

					return {
						stdout: result.stdout,
						stderr: result.stderr,
						exitCode: result.exitCode,
						timedOut: false,
					};
				}),
		}),
	},
) {}
