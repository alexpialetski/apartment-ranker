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
 * Returns two flats from the same band (random pair). Returns null if fewer than 2 success flats in band.
 */
export async function getComparisonPair(
	deps: GetComparisonPairDeps,
	input: { band: string },
): Promise<ComparisonPair | null> {
	const flats = await deps.flatRepo.listSuccessByBand(input.band);
	if (flats.length < 2) return null;
	const [i, j] = pickTwoRandomIndices(flats.length);
	const left = flats[i];
	const right = flats[j];
	if (!left || !right) return null;
	return { left, right };
}

function pickTwoRandomIndices(n: number): [number, number] {
	const i = Math.floor(Math.random() * n);
	let j = Math.floor(Math.random() * n);
	while (j === i) {
		j = Math.floor(Math.random() * n);
	}
	return [i, j];
}
