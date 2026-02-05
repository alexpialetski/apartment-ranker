import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface GetComparisonPairDeps {
	flatRepo: IFlatRepository;
	getAllBandLabels: () => string[];
}

export interface ComparisonPair {
	left: Flat;
	right: Flat;
}

function pickPairFromFlats(flats: Flat[]): ComparisonPair | null {
	if (flats.length < 2) return null;
	const maxRd = Math.max(...flats.map((f) => f.ratingDeviation));
	const withMaxRd = flats.filter((f) => f.ratingDeviation === maxRd);
	const left = withMaxRd[Math.floor(Math.random() * withMaxRd.length)];
	if (!left) return null;
	const rest = flats.filter((f) => f.id !== left.id);
	const right = rest[Math.floor(Math.random() * rest.length)];
	if (!right) return null;
	return { left, right };
}

/**
 * Returns two flats from the same band: one with highest rating deviation (least compared),
 * the other at random from the rest. If band is omitted, picks a band that has 2+ flats at random.
 * Returns null if no band has at least 2 success flats.
 */
export async function getComparisonPair(
	deps: GetComparisonPairDeps,
	input: { band?: string },
): Promise<ComparisonPair | null> {
	if (input.band) {
		const flats = await deps.flatRepo.listSuccessByBand(input.band);
		return pickPairFromFlats(flats);
	}
	const labels = deps.getAllBandLabels();
	const shuffled = [...labels].sort(() => Math.random() - 0.5);
	for (const band of shuffled) {
		const flats = await deps.flatRepo.listSuccessByBand(band);
		const pair = pickPairFromFlats(flats);
		if (pair) return pair;
	}
	return null;
}
