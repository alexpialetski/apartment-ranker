import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "~/env";

const QUEUE_NAME = "scrape-flats";

const globalForQueue = globalThis as unknown as {
	redis: IORedis | undefined;
	scrapeFlatsQueue: Queue | undefined;
};

function getRedis(): IORedis {
	if (!globalForQueue.redis) {
		globalForQueue.redis = new IORedis(env.REDIS_URL, {
			maxRetriesPerRequest: null,
		});
	}
	return globalForQueue.redis;
}

/** Shared Redis connection for queue and worker. */
export function getQueueConnection(): IORedis {
	return getRedis();
}

/** BullMQ queue for scrape jobs. Job data: { flatId: number }. */
export function getScrapeFlatsQueue(): Queue {
	if (!globalForQueue.scrapeFlatsQueue) {
		globalForQueue.scrapeFlatsQueue = new Queue(QUEUE_NAME, {
			connection: getRedis(),
			defaultJobOptions: { removeOnComplete: { count: 100 } },
		});
	}
	return globalForQueue.scrapeFlatsQueue;
}

export { QUEUE_NAME };
