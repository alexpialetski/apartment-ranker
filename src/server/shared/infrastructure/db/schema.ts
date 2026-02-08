// Apartment Ranker schema: flats and comparisons for ranking Realt.by listings.

import { relations, sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator(
	(name) => `apartment-ranker_${name}`,
);

/** Scrape status for a flat. Only "success" flats appear in Compare and Rank. */
export const SCRAPE_STATUSES = [
	"pending",
	"scraping",
	"success",
	"error",
] as const;
export type ScrapeStatus = (typeof SCRAPE_STATUSES)[number];

export const flats = createTable(
	"flat",
	(d) => ({
		id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
		realtUrl: d.text({ length: 2048 }).notNull().unique(),
		price: d.real(),
		pricePerSqm: d.real(),
		rooms: d.integer(),
		location: d.text(),
		area: d.real(),
		imageUrl: d.text({ length: 2048 }),
		scrapeStatus: d.text({ length: 32 }).notNull().default("pending"),
		eloRating: d.real().notNull().default(1500),
		/** Glicko-2 rating deviation (RD). Default 350. */
		ratingDeviation: d.real().default(350),
		/** Glicko-2 volatility. Default 0.06. */
		volatility: d.real().default(0.06),
		/** Band = room count + price-per-m² range, e.g. "1-room_1800-1900". Used to compare/rank only within same band. */
		band: d.text(),
		/** Date when the flat was listed for sale (from Realt.by createdAt). */
		listedAt: d.integer({ mode: "timestamp" }),
		createdAt: d
			.integer({ mode: "timestamp" })
			.default(sql`(unixepoch())`)
			.notNull(),
		updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
		/** Set when flat is soft-deleted (Remove by URL). Comparisons history kept. */
		deletedAt: d.integer({ mode: "timestamp" }),
	}),
	(t) => [
		index("flat_scrape_status_idx").on(t.scrapeStatus),
		index("flat_band_idx").on(t.band),
		index("flat_band_elo_idx").on(t.band, t.eloRating),
	],
);

export const comparisons = createTable("comparison", (d) => ({
	id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	winnerId: d
		.integer({ mode: "number" })
		.notNull()
		.references(() => flats.id),
	loserId: d
		.integer({ mode: "number" })
		.notNull()
		.references(() => flats.id),
	createdAt: d
		.integer({ mode: "timestamp" })
		.default(sql`(unixepoch())`)
		.notNull(),
}));

export const flatsRelations = relations(flats, (helpers) => ({
	winsAsWinner: helpers.many(comparisons, { relationName: "winner" }),
	winsAsLoser: helpers.many(comparisons, { relationName: "loser" }),
}));

export const comparisonsRelations = relations(comparisons, (helpers) => ({
	winner: helpers.one(flats, {
		fields: [comparisons.winnerId],
		references: [flats.id],
		relationName: "winner",
	}),
	loser: helpers.one(flats, {
		fields: [comparisons.loserId],
		references: [flats.id],
		relationName: "loser",
	}),
}));
