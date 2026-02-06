import { Glicko2 } from "glicko2";
import type { IComparisonRepository } from "~/server/comparison/port/comparison.repository";
import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export const DEFAULT_RD = 350;
export const DEFAULT_VOLATILITY = 0.06;

export interface RecalculateBandRatingsDeps {
	flatRepo: IFlatRepository;
	comparisonRepo: IComparisonRepository;
}

/**
 * Recalculates Glicko-2 ratings for all active flats in a given band.
 * If band is null, this function does nothing (no recalculation needed).
 *
 * @param deps - Dependencies: flatRepo and comparisonRepo
 * @param band - The band to recalculate ratings for, or null to skip
 */
export async function recalculateBandRatings(
	deps: RecalculateBandRatingsDeps,
	band: string | null,
): Promise<void> {
	if (band === null) {
		// No band means no recalculation needed (same behavior as submitComparison)
		return;
	}

	const bandFlats: Flat[] = await deps.flatRepo.listSuccessByBand(band);

	// If no flats in band, nothing to recalculate
	if (bandFlats.length === 0) {
		return;
	}

	const flatIds = bandFlats.map((f) => f.id);
	const comparisonRows = await deps.comparisonRepo.listByFlatIds(flatIds);

	const ranking = new Glicko2({
		rating: 1500,
		rd: DEFAULT_RD,
		vol: DEFAULT_VOLATILITY,
	});

	const playersByFlatId = new Map<number, ReturnType<Glicko2["makePlayer"]>>();
	for (const flat of bandFlats) {
		const player = ranking.makePlayer(
			flat.eloRating,
			flat.ratingDeviation ?? DEFAULT_RD,
			flat.volatility ?? DEFAULT_VOLATILITY,
		);
		playersByFlatId.set(flat.id, player);
	}

	const matches: [
		ReturnType<Glicko2["makePlayer"]>,
		ReturnType<Glicko2["makePlayer"]>,
		number,
	][] = [];
	for (const { winnerId: wId, loserId: lId } of comparisonRows) {
		const pw = playersByFlatId.get(wId);
		const pl = playersByFlatId.get(lId);
		if (pw && pl) matches.push([pw, pl, 1]);
	}

	ranking.updateRatings(matches);

	await Promise.all(
		bandFlats.map((flat) => {
			const player = playersByFlatId.get(flat.id);
			if (!player) return Promise.resolve();
			return deps.flatRepo.update(flat.id, {
				eloRating: player.getRating(),
				ratingDeviation: player.getRd(),
				volatility: player.getVol(),
			});
		}),
	);
}
