import type {
	IScrapeEventPublisher,
	ScrapeSuccessFlatPayload,
} from "~/server/scraping/port/scrape-events.port";
import { publishScrapeEvent } from "~/server/shared/infrastructure/sse/scrape-events";

export function createScrapeEventPublisher(): IScrapeEventPublisher {
	return {
		publishSuccess(flatId: number, flat: ScrapeSuccessFlatPayload) {
			publishScrapeEvent({
				type: "flat_scraping_success",
				flatId,
				flat: {
					id: flat.id,
					realtUrl: flat.realtUrl,
					price: flat.price,
					pricePerSqm: flat.pricePerSqm,
					rooms: flat.rooms,
					location: flat.location,
					area: flat.area,
					imageUrl: flat.imageUrl,
					scrapeStatus: flat.scrapeStatus,
					band: flat.band,
				},
			});
		},
		publishError(flatId: number, error: string) {
			publishScrapeEvent({
				type: "flat_scraping_error",
				flatId,
				error,
			});
		},
	};
}
