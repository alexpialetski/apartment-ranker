import { Worker } from "bullmq";
import { eq } from "drizzle-orm";

import { getBandLabel } from "~/server/bands";
import { db } from "~/server/db";
import { flats } from "~/server/db/schema";
import { getQueueConnection, QUEUE_NAME } from "~/server/queue";
import { scrapeRealtListing } from "~/server/scraper/realt";
import { publishScrapeEvent } from "~/server/sse/scrape-events";

export type ScrapeJobPayload = { flatId: number };

let workerInstance: Worker<ScrapeJobPayload> | null = null;

async function processScrapeJob(payload: ScrapeJobPayload): Promise<void> {
	const { flatId } = payload;
	console.log("[scrape-flats] Processing job for flatId:", flatId);

	const [flat] = await db
		.select()
		.from(flats)
		.where(eq(flats.id, flatId))
		.limit(1);

	if (!flat) {
		console.error("[scrape-flats] Flat not found:", flatId);
		return;
	}

	const SCRAPE_TIMEOUT_MS = 25_000;

	let result;
	try {
		result = await Promise.race([
			scrapeRealtListing(flat.realtUrl),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Scrape timeout (25s)")),
					SCRAPE_TIMEOUT_MS,
				),
			),
		]);
	} catch (err) {
		console.error("[scrape-flats] Scraper threw for flatId", flatId, err);
		await db
			.update(flats)
			.set({ scrapeStatus: "error" })
			.where(eq(flats.id, flatId));
		publishScrapeEvent({ type: "flat_scraping_error", flatId, error: String(err) });
		return;
	}

	if (result.success) {
		const band = getBandLabel(result.data.rooms, result.data.pricePerSqm);
		await db
			.update(flats)
			.set({
				price: result.data.price,
				pricePerSqm: result.data.pricePerSqm,
				rooms: result.data.rooms,
				location: result.data.location,
				area: result.data.area ?? null,
				scrapeStatus: "success",
				band,
			})
			.where(eq(flats.id, flatId));
	} else {
		await db
			.update(flats)
			.set({ scrapeStatus: "error" })
			.where(eq(flats.id, flatId));
		console.error(
			"[scrape-flats] Scrape failed for flat",
			flatId,
			result.error,
		);
	}

	// Notify SSE subscribers so clients can update the card
	const [updated] = await db
		.select({
			id: flats.id,
			realtUrl: flats.realtUrl,
			price: flats.price,
			pricePerSqm: flats.pricePerSqm,
			rooms: flats.rooms,
			location: flats.location,
			area: flats.area,
			scrapeStatus: flats.scrapeStatus,
			band: flats.band,
		})
		.from(flats)
		.where(eq(flats.id, flatId))
		.limit(1);

	console.log(
		"[scrape-flats] Done for flatId",
		flatId,
		result.success ? "success" : "error",
	);

	if (updated) {
		if (result.success && updated.scrapeStatus === "success") {
			publishScrapeEvent({
				type: "flat_scraping_success",
				flatId,
				flat: {
					id: updated.id,
					realtUrl: updated.realtUrl,
					price: updated.price,
					pricePerSqm: updated.pricePerSqm,
					rooms: updated.rooms,
					location: updated.location,
					area: updated.area,
					scrapeStatus: updated.scrapeStatus,
					band: updated.band,
				},
			});
		} else {
			publishScrapeEvent({
				type: "flat_scraping_error",
				flatId,
				error: result.success ? "" : result.error,
			});
		}
	}
}

export function startWorker(): void {
	if (workerInstance) return;

	const connection = getQueueConnection();
	workerInstance = new Worker<ScrapeJobPayload>(
		QUEUE_NAME,
		async (job) => {
			await processScrapeJob(job.data);
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
