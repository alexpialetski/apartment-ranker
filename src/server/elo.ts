/**
 * Incremental Elo update after a comparison. Only the two involved flats are updated.
 * K = 32. No full recomputation.
 */

import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "~/server/db/schema";
import { flats } from "~/server/db/schema";

const K = 32;

function expectedScore(ratingA: number, ratingB: number): number {
	return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Updates Elo ratings for winner and loser after a comparison.
 * Loads current ratings, computes new ones, updates both flats.
 */
export async function updateElo(
	db: LibSQLDatabase<typeof schema>,
	winnerId: number,
	loserId: number,
): Promise<void> {
	const [winnerRow, loserRow] = await Promise.all([
		db.query.flats.findFirst({
			where: eq(flats.id, winnerId),
			columns: { eloRating: true },
		}),
		db.query.flats.findFirst({
			where: eq(flats.id, loserId),
			columns: { eloRating: true },
		}),
	]);

	const ratingW = winnerRow?.eloRating ?? 1500;
	const ratingL = loserRow?.eloRating ?? 1500;

	const expectedW = expectedScore(ratingW, ratingL);
	const expectedL = expectedScore(ratingL, ratingW);

	const newRatingW = ratingW + K * (1 - expectedW);
	const newRatingL = ratingL + K * (0 - expectedL);

	await Promise.all([
		db
			.update(flats)
			.set({ eloRating: newRatingW })
			.where(eq(flats.id, winnerId)),
		db
			.update(flats)
			.set({ eloRating: newRatingL })
			.where(eq(flats.id, loserId)),
	]);
}
