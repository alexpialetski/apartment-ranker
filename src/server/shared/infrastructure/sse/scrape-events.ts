/**
 * Scrape job completion events via Redis pub/sub so the worker and SSE route
 * can be in different processes (e.g. Next.js dev). Single channel avoids
 * duplicate delivery when they share a process.
 */

import { getQueueConnection } from "~/server/shared/infrastructure/queue";

export const SCRAPE_EVENTS_CHANNEL = "apartment-ranker:scrape-events";

export type ScrapeEvent =
	| {
			type: "flat_scraping_success";
			flatId: number;
			flat: {
				id: number;
				realtUrl: string;
				price: number | null;
				pricePerSqm: number | null;
				rooms: number | null;
				location: string | null;
				area: number | null;
				scrapeStatus: string;
				band: string | null;
			};
	  }
	| {
			type: "flat_scraping_error";
			flatId: number;
			error: string;
	  };

export function publishScrapeEvent(event: ScrapeEvent): void {
	try {
		const redis = getQueueConnection();
		redis.publish(SCRAPE_EVENTS_CHANNEL, JSON.stringify(event));
	} catch (err) {
		console.error("[sse] Redis publish error:", err);
	}
}
