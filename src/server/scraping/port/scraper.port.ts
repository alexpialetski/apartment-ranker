import type { ScrapeResult } from "~/server/shared/lib/scrape-result";

export interface IRealtScraper {
	scrape(url: string): Promise<ScrapeResult>;
}
