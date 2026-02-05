import type { IFlatRepository } from "~/server/flat/port/flat.repository";
import type {
	IScrapeEventPublisher,
	ScrapeSuccessFlatPayload,
} from "~/server/scraping/port/scrape-events.port";
import type { IRealtScraper } from "~/server/scraping/port/scraper.port";
import { createLogger } from "~/server/shared/lib/logger";
import type { ScrapeResult } from "~/server/shared/lib/scrape-result";

const SCRAPE_TIMEOUT_MS = 25_000;
const log = createLogger("process-scrape-job");

export interface ProcessScrapeJobDeps {
	flatRepo: IFlatRepository;
	scraper: IRealtScraper;
	eventPublisher: IScrapeEventPublisher;
	getBandLabel: (rooms: number, pricePerSqm: number) => string | null;
}

export async function processScrapeJob(
	deps: ProcessScrapeJobDeps,
	input: { flatId: number },
): Promise<void> {
	const { flatId } = input;
	const flat = await deps.flatRepo.findById(flatId);
	if (!flat) {
		return;
	}

	let result: ScrapeResult;
	try {
		result = await Promise.race([
			deps.scraper.scrape(flat.realtUrl),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Scrape timeout (25s)")),
					SCRAPE_TIMEOUT_MS,
				),
			),
		]);
	} catch (err) {
		log.error({ flatId, error: String(err) }, "Scrape failed");
		await deps.flatRepo.update(flatId, { scrapeStatus: "error" });
		deps.eventPublisher.publishError(flatId, String(err));
		return;
	}

	if (result.success) {
		log.debug({ flatId }, "Scrape success");
		const band = deps.getBandLabel(result.data.rooms, result.data.pricePerSqm);
		await deps.flatRepo.update(flatId, {
			price: result.data.price,
			pricePerSqm: result.data.pricePerSqm,
			rooms: result.data.rooms,
			location: result.data.location,
			area: result.data.area ?? null,
			imageUrl: result.data.imageUrl ?? null,
			scrapeStatus: "success",
			band,
		});
		const updated = await deps.flatRepo.findById(flatId);
		if (updated && updated.scrapeStatus === "success") {
			const payload: ScrapeSuccessFlatPayload = {
				id: updated.id,
				realtUrl: updated.realtUrl,
				price: updated.price,
				pricePerSqm: updated.pricePerSqm,
				rooms: updated.rooms,
				location: updated.location,
				area: updated.area,
				imageUrl: updated.imageUrl,
				scrapeStatus: updated.scrapeStatus,
				band: updated.band,
			};
			deps.eventPublisher.publishSuccess(flatId, payload);
		}
	} else {
		log.error({ flatId, error: result.error }, "Scrape failed");
		await deps.flatRepo.update(flatId, { scrapeStatus: "error" });
		deps.eventPublisher.publishError(flatId, result.error);
	}
}
