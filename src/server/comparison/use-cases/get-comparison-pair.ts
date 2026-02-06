import type { IComparisonRepository } from "~/server/comparison/port/comparison.repository";
import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface GetComparisonPairDeps {
	flatRepo: IFlatRepository;
	comparisonRepo: IComparisonRepository;
	getAllBandLabels: () => string[];
}

export interface ComparisonPair {
	left: Flat;
	right: Flat;
}

function getPairKey(flat1: Flat, flat2: Flat): string {
	const min = Math.min(flat1.id, flat2.id);
	const max = Math.max(flat1.id, flat2.id);
	return `${min}-${max}`;
}

function pickPairFromFlats(
	flats: Flat[],
	comparedPairKeys: Set<string>,
): ComparisonPair | null {
	if (flats.length < 2) return null;

	// Generate all possible pairs and filter out already compared ones
	const availablePairs: Array<{ left: Flat; right: Flat }> = [];
	for (let i = 0; i < flats.length; i++) {
		const leftFlat = flats[i];
		if (leftFlat == null) continue;
		for (let j = i + 1; j < flats.length; j++) {
			const rightFlat = flats[j];
			if (rightFlat == null) continue;
			const pairKey = getPairKey(leftFlat, rightFlat);
			if (!comparedPairKeys.has(pairKey)) {
				availablePairs.push({ left: leftFlat, right: rightFlat });
			}
		}
	}

	if (availablePairs.length === 0) return null;

	// Prefer pairs that include a flat with high rating deviation (least compared)
	const maxRd = Math.max(...flats.map((f) => f.ratingDeviation));
	const pairsWithMaxRd = availablePairs.filter(
		(p) =>
			p.left.ratingDeviation === maxRd || p.right.ratingDeviation === maxRd,
	);

	const pairsToChooseFrom =
		pairsWithMaxRd.length > 0 ? pairsWithMaxRd : availablePairs;
	const chosen =
		pairsToChooseFrom[Math.floor(Math.random() * pairsToChooseFrom.length)];
	if (!chosen) return null;

	// Randomize which flat is left/right
	return Math.random() < 0.5
		? { left: chosen.left, right: chosen.right }
		: { left: chosen.right, right: chosen.left };
}

/**
 * Returns two flats from the same band that haven't been compared yet.
 * Prefers pairs including flats with high rating deviation (least compared).
 * If band is omitted, picks a band that has 2+ flats at random.
 * Returns null if no band has at least 2 success flats, or if all pairs in the band have been compared.
 */
export async function getComparisonPair(
	deps: GetComparisonPairDeps,
	input: { band?: string },
): Promise<ComparisonPair | null> {
	if (input.band) {
		const flats = await deps.flatRepo.listSuccessByBand(input.band);
		if (flats.length < 2) return null;
		const flatIds = flats.map((f) => f.id);
		const comparedPairKeys =
			await deps.comparisonRepo.getComparedPairKeys(flatIds);
		return pickPairFromFlats(flats, comparedPairKeys);
	}
	const labels = deps.getAllBandLabels();
	const shuffled = [...labels].sort(() => Math.random() - 0.5);
	for (const band of shuffled) {
		const flats = await deps.flatRepo.listSuccessByBand(band);
		if (flats.length < 2) continue;
		const flatIds = flats.map((f) => f.id);
		const comparedPairKeys =
			await deps.comparisonRepo.getComparedPairKeys(flatIds);
		const pair = pickPairFromFlats(flats, comparedPairKeys);
		if (pair) return pair;
	}
	return null;
}
