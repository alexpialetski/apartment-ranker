import { Worker } from "bullmq";

import { getUseCases } from "~/server/app/composition";
import {
	getQueueConnection,
	QUEUE_NAME,
} from "~/server/shared/infrastructure/queue";
import { createLogger } from "~/server/shared/lib/logger";

export type ScrapeJobPayload = { flatId: number };

const log = createLogger("scrape-flats");

let workerInstance: Worker<ScrapeJobPayload> | null = null;

export function startWorker(): void {
	if (workerInstance) return;

	const useCases = getUseCases();
	const connection = getQueueConnection();
	workerInstance = new Worker<ScrapeJobPayload>(
		QUEUE_NAME,
		async (job) => {
			const { flatId } = job.data;
			log.debug({ flatId }, "Processing job");
			await useCases.processScrapeJob({ flatId });
			log.debug({ flatId }, "Done");
		},
		{ connection, concurrency: 2 },
	);

	workerInstance.on("failed", (job, err) => {
		log.error({ jobId: job?.id, err }, "Job failed");
	});
}

export function getWorker(): Worker<ScrapeJobPayload> | null {
	return workerInstance;
}
