export interface ScrapedFlatData {
	price: number;
	pricePerSqm: number;
	rooms: number;
	location: string;
	area?: number;
	imageUrl?: string;
}

export type ScrapeResult =
	| { success: true; data: ScrapedFlatData }
	| { success: false; error: string };
