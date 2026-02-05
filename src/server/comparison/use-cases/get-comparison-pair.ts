import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface GetComparisonPairDeps {
	flatRepo: IFlatRepository;
}

export interface ComparisonPair {
	left: Flat;
	right: Flat;
}

/**
 * Returns two flats from the same band: one with highest rating deviation (least compared),
 * the other at random from the rest. Returns null if fewer than 2 success flats in band.
 */
export async function getComparisonPair(
	deps: GetComparisonPairDeps,
	input: { band: string },
): Promise<ComparisonPair | null> {
	const flats = await deps.flatRepo.listSuccessByBand(input.band);
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
