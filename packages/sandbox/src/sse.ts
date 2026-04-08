import { type Effect, Stream } from "effect";
import type { CommandStreamError } from "./errors";

export interface SSEFrame {
	readonly event: string;
	readonly data: unknown;
}

export interface ExecResult {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}

const extractFrame = (raw: string): SSEFrame | null => {
	const lines = raw.split("\n");
	let event = "";
	const dataLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith("event:")) {
			event = line.slice(6).trim();
		} else if (line.startsWith("data: ")) {
			dataLines.push(line.slice(6));
		} else if (line.startsWith("data:")) {
			dataLines.push(line.slice(5));
		}
	}

	if (dataLines.length === 0) return null;
	const joined = dataLines.join("\n");
	if (joined === "[DONE]") return null;

	try {
		const data = JSON.parse(joined);
		return { event: event || (data as Record<string, unknown>).type?.toString() || "", data };
	} catch {
		return { event, data: joined };
	}
};

export const parseExecdSSE = <E, R>(
	stream: Stream.Stream<string, E, R>,
): Stream.Stream<SSEFrame, E, R> =>
	stream.pipe(
		Stream.mapAccum("", (buffer, chunk: string) => {
			const combined = buffer + chunk;
			const parts = combined.split("\n\n");
			const remainder = parts.pop() ?? "";
			const frames: SSEFrame[] = [];
			for (const part of parts) {
				const trimmed = part.trim();
				if (trimmed.length === 0) continue;
				const frame = extractFrame(trimmed);
				if (frame) frames.push(frame);
			}
			return [remainder, frames] as const;
		}),
		Stream.mapConcat((frames) => frames),
	);

export const collectExecResult = <E, R>(
	stream: Stream.Stream<SSEFrame, E, R>,
): Effect.Effect<ExecResult, E | CommandStreamError, R> =>
	Stream.runFold(stream, { stdout: "", stderr: "", exitCode: 0 } as ExecResult, (acc, frame) => {
		switch (frame.event) {
			case "stdout": {
				const text = (frame.data as Record<string, unknown>)?.text ?? "";
				return { ...acc, stdout: acc.stdout + text };
			}
			case "stderr": {
				const text = (frame.data as Record<string, unknown>)?.text ?? "";
				return { ...acc, stderr: acc.stderr + text };
			}
			case "error": {
				const err = frame.data as Record<string, unknown>;
				const evalue = (err?.error as Record<string, unknown>)?.evalue ?? err?.message ?? "";
				return { ...acc, stderr: acc.stderr + evalue };
			}
			case "execution_complete": {
				const d = frame.data as Record<string, unknown>;
				const code = (d?.exit_code as number) ?? (d?.exitCode as number) ?? 0;
				return { ...acc, exitCode: code };
			}
			default:
				return acc;
		}
	});
