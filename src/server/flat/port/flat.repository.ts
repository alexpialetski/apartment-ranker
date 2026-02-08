import type { Flat, ScrapeStatus } from "~/server/flat/domain/flat";

/** Fields that can be updated on a flat (e.g. after scrape or Elo update). */
export interface FlatUpdate {
	price?: number | null;
	pricePerSqm?: number | null;
	rooms?: number | null;
	location?: string | null;
	area?: number | null;
	imageUrl?: string | null;
	scrapeStatus?: ScrapeStatus;
	eloRating?: number;
	ratingDeviation?: number;
	volatility?: number;
	band?: string | null;
	listedAt?: Date | null;
	deletedAt?: Date | null;
}

export interface IFlatRepository {
	findByRealtUrl(url: string): Promise<Flat | null>;
	/** Like findByRealtUrl but includes soft-deleted (for restore on re-add). */
	findByRealtUrlIncludingDeleted(url: string): Promise<Flat | null>;
	findById(id: number): Promise<Flat | null>;
	create(data: { realtUrl: string; scrapeStatus: ScrapeStatus }): Promise<Flat>;
	update(id: number, data: Partial<FlatUpdate>): Promise<Flat>;
	deleteByRealtUrl(url: string): Promise<boolean>;
	listAll(): Promise<Flat[]>;
	listSuccessByBand(band: string): Promise<Flat[]>;
}
