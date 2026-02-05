import type { IRealtScraper } from "~/server/scraping/port/scraper.port";
import { scrapeRealtListing } from "~/server/shared/infrastructure/scraper/realt";

export function createRealtScraperAdapter(): IRealtScraper {
	return {
		scrape(url: string) {
			return scrapeRealtListing(url);
		},
	};
}
