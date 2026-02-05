import { getScrapeFlatsQueue } from "~/server/shared/infrastructure/queue";
import type { IScrapeJobQueue } from "~/server/shared/port/scrape-job.queue";

export function createScrapeJobQueue(): IScrapeJobQueue {
	const queue = getScrapeFlatsQueue();
	return {
		async add(flatId: number) {
			await queue.add("scrape", { flatId });
		},
	};
}
