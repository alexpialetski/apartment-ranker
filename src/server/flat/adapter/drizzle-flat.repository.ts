import { and, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "~/server/shared/infrastructure/db/schema";
import { flats } from "~/server/shared/infrastructure/db/schema";
import type { Flat, ScrapeStatus } from "~/server/flat/domain/flat";
import type { FlatUpdate, IFlatRepository } from "~/server/flat/port/flat.repository";

function toDate(value: Date | number | null | undefined): Date {
	if (value == null) return new Date(0);
	if (value instanceof Date) return value;
	return new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
}

function rowToFlat(row: {
	id: number;
	realtUrl: string;
	price: number | null;
	pricePerSqm: number | null;
	rooms: number | null;
	location: string | null;
	area: number | null;
	scrapeStatus: string;
	eloRating: number;
	band: string | null;
	createdAt: Date | number;
	updatedAt: Date | number | null;
}): Flat {
	return {
		id: row.id,
		realtUrl: row.realtUrl,
		price: row.price,
		pricePerSqm: row.pricePerSqm,
		rooms: row.rooms,
		location: row.location,
		area: row.area,
		scrapeStatus: row.scrapeStatus as ScrapeStatus,
		eloRating: row.eloRating,
		band: row.band,
		createdAt: toDate(row.createdAt),
		updatedAt: row.updatedAt != null ? toDate(row.updatedAt) : null,
	};
}

export function createFlatRepository(
	db: LibSQLDatabase<typeof schema>,
): IFlatRepository {
	return {
		async findByRealtUrl(url: string) {
			const [row] = await db
				.select()
				.from(flats)
				.where(eq(flats.realtUrl, url))
				.limit(1);
			return row ? rowToFlat(row) : null;
		},

		async findById(id: number) {
			const [row] = await db
				.select()
				.from(flats)
				.where(eq(flats.id, id))
				.limit(1);
			return row ? rowToFlat(row) : null;
		},

		async create(data) {
			const [row] = await db
				.insert(flats)
				.values({
					realtUrl: data.realtUrl,
					scrapeStatus: data.scrapeStatus,
				})
				.returning();
			if (!row) throw new Error("Failed to create flat");
			return rowToFlat(row);
		},

		async update(id: number, data: Partial<FlatUpdate>) {
			const [row] = await db
				.update(flats)
				.set(data as Record<string, unknown>)
				.where(eq(flats.id, id))
				.returning();
			if (!row) throw new Error("Flat not found for update");
			return rowToFlat(row);
		},

		async deleteByRealtUrl(url: string) {
			const deleted = await db
				.delete(flats)
				.where(eq(flats.realtUrl, url))
				.returning({ id: flats.id });
			return deleted.length > 0;
		},

		async listAll() {
			const rows = await db
				.select()
				.from(flats)
				.orderBy(desc(flats.createdAt));
			return rows.map(rowToFlat);
		},

		async listSuccessByBand(band: string) {
			const rows = await db
				.select()
				.from(flats)
				.where(
					and(eq(flats.band, band), eq(flats.scrapeStatus, "success")),
				)
				.orderBy(desc(flats.eloRating));
			return rows.map(rowToFlat);
		},
	};
}
