/** Minimal flat payload for SSE success event (matches client expectation). */
export interface ScrapeSuccessFlatPayload {
	id: number;
	realtUrl: string;
	price: number | null;
	pricePerSqm: number | null;
	rooms: number | null;
	location: string | null;
	area: number | null;
	imageUrl: string | null;
	scrapeStatus: string;
	band: string | null;
}

export interface IScrapeEventPublisher {
	publishSuccess(flatId: number, flat: ScrapeSuccessFlatPayload): void;
	publishError(flatId: number, error: string): void;
}
