import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createCaller } from "~/server/api/root";
import type { UseCasesContainer } from "~/server/app/composition";
import { buildUseCases } from "~/server/app/composition";
import { db } from "~/server/shared/infrastructure/db";
import type * as schema from "~/server/shared/infrastructure/db/schema";
import { comparisons, flats } from "~/server/shared/infrastructure/db/schema";
import type { IScrapeJobQueue } from "~/server/shared/port/scrape-job.queue";

let migrated = false;

export const mockScrapeQueue: IScrapeJobQueue = {
	add: async () => {},
};

/**
 * Return the app db (same as env DATABASE_URL, which is the test DB in vitest).
 * Run migrations once so tables exist.
 */
export async function getTestDb(): Promise<LibSQLDatabase<typeof schema>> {
	if (!migrated) {
		await migrate(db, { migrationsFolder: "./drizzle" });
		migrated = true;
	}
	return db as LibSQLDatabase<typeof schema>;
}

/**
 * Delete all rows from flats and comparisons so tests start clean.
 */
export async function truncateTestDb(
	db: LibSQLDatabase<typeof schema>,
): Promise<void> {
	await db.delete(comparisons);
	await db.delete(flats);
}

/**
 * Build use cases with test DB and mock queue, then return a tRPC caller.
 */
export async function createTestCaller(): Promise<
	ReturnType<typeof createCaller>
> {
	const db = await getTestDb();
	const useCases = buildUseCases({ db, scrapeQueue: mockScrapeQueue });
	return createCaller({ useCases, headers: new Headers() });
}

export type { UseCasesContainer };
