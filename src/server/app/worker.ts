import { Worker } from "bullmq";

import { getUseCases } from "~/server/app/composition";
import { getQueueConnection, QUEUE_NAME } from "~/server/shared/infrastructure/queue";

export type ScrapeJobPayload = { flatId: number };

let workerInstance: Worker<ScrapeJobPayload> | null = null;

export function startWorker(): void {
	if (workerInstance) return;

	const useCases = getUseCases();
	const connection = getQueueConnection();
	workerInstance = new Worker<ScrapeJobPayload>(
		QUEUE_NAME,
		async (job) => {
			const { flatId } = job.data;
			console.log("[scrape-flats] Processing job for flatId:", flatId);
			await useCases.processScrapeJob({ flatId });
			console.log("[scrape-flats] Done for flatId", flatId);
		},
		{ connection, concurrency: 2 },
	);

	workerInstance.on("failed", (job, err) => {
		console.error("[scrape-flats] Job failed:", job?.id, err);
	});
}

export function getWorker(): Worker<ScrapeJobPayload> | null {
	return workerInstance;
}
