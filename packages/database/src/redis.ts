import Redis from "ioredis";

export function createRedisConnection(opts?: { url?: string }): Redis {
	const redisUrl = opts?.url ?? process.env.REDIS_URL;
	if (!redisUrl) {
		throw new Error("REDIS_URL environment variable is not set");
	}

	return new Redis(redisUrl, {
		maxRetriesPerRequest: null,
	});
}
