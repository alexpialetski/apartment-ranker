/** Scrape status for a flat. Only "success" flats appear in Compare and Rank. */
export const SCRAPE_STATUSES = [
	"pending",
	"scraping",
	"success",
	"error",
] as const;
export type ScrapeStatus = (typeof SCRAPE_STATUSES)[number];

export interface Flat {
	id: number;
	realtUrl: string;
	price: number | null;
	pricePerSqm: number | null;
	rooms: number | null;
	location: string | null;
	area: number | null;
	imageUrl: string | null;
	scrapeStatus: ScrapeStatus;
	eloRating: number;
	ratingDeviation: number;
	volatility: number;
	band: string | null;
	/** Date when the flat was listed for sale (from Realt.by createdAt). */
	listedAt: Date | null;
	createdAt: Date;
	updatedAt: Date | null;
	deletedAt: Date | null;
}
