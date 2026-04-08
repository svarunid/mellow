import { Stream } from "effect";

const extractData = (frame: string): string | null => {
	const lines = frame.split("\n");
	const dataLines: string[] = [];
	for (const line of lines) {
		if (line.startsWith("data: ")) {
			dataLines.push(line.slice(6));
		} else if (line.startsWith("data:")) {
			dataLines.push(line.slice(5));
		}
	}
	if (dataLines.length === 0) return null;
	const joined = dataLines.join("\n");
	if (joined === "[DONE]") return null;
	return joined;
};

export const parseSSE = <E, R>(stream: Stream.Stream<string, E, R>): Stream.Stream<unknown, E, R> =>
	stream.pipe(
		Stream.mapAccum("", (buffer, chunk: string) => {
			const combined = buffer + chunk;
			const parts = combined.split("\n\n");
			const remainder = parts.pop() ?? "";
			const frames: unknown[] = [];
			for (const part of parts) {
				const trimmed = part.trim();
				if (trimmed.length === 0) continue;
				const data = extractData(trimmed);
				if (data === null) continue;
				try {
					frames.push(JSON.parse(data));
				} catch {
					/* skip malformed JSON */
				}
			}
			return [remainder, frames] as const;
		}),
		Stream.mapConcat((frames) => frames),
	);
