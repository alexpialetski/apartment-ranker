import type { IFlatRepository } from "~/server/flat/port/flat.repository";
import type { IRealtScraper } from "~/server/scraping/port/scraper.port";
import type {
	IScrapeEventPublisher,
	ScrapeSuccessFlatPayload,
} from "~/server/scraping/port/scrape-events.port";

const SCRAPE_TIMEOUT_MS = 25_000;

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

	let result;
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
		await deps.flatRepo.update(flatId, { scrapeStatus: "error" });
		deps.eventPublisher.publishError(flatId, String(err));
		return;
	}

	if (result.success) {
		const band = deps.getBandLabel(result.data.rooms, result.data.pricePerSqm);
		await deps.flatRepo.update(flatId, {
			price: result.data.price,
			pricePerSqm: result.data.pricePerSqm,
			rooms: result.data.rooms,
			location: result.data.location,
			area: result.data.area ?? null,
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
				scrapeStatus: updated.scrapeStatus,
				band: updated.band,
			};
			deps.eventPublisher.publishSuccess(flatId, payload);
		}
	} else {
		await deps.flatRepo.update(flatId, { scrapeStatus: "error" });
		deps.eventPublisher.publishError(flatId, result.error);
	}
}
