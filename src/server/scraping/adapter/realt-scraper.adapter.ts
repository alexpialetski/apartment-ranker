import { scrapeRealtListing } from "~/server/shared/infrastructure/scraper/realt";
import type { IRealtScraper } from "~/server/scraping/port/scraper.port";

export function createRealtScraperAdapter(): IRealtScraper {
	return {
		scrape(url: string) {
			return scrapeRealtListing(url);
		},
	};
}
