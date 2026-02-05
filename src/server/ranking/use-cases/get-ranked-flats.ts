import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface GetRankedFlatsDeps {
	flatRepo: IFlatRepository;
	getAllBandLabels: () => string[];
}

export interface BandRanking {
	band: string;
	flats: Flat[];
}

/**
 * Returns success flats grouped by band, ordered by eloRating desc within each band.
 * Only bands that have at least one success flat are included.
 */
export async function getRankedFlats(
	deps: GetRankedFlatsDeps,
): Promise<BandRanking[]> {
	const bandLabels = deps.getAllBandLabels();
	const results: BandRanking[] = [];
	for (const band of bandLabels) {
		const flats = await deps.flatRepo.listSuccessByBand(band);
		if (flats.length > 0) {
			results.push({ band, flats });
		}
	}
	return results;
}
