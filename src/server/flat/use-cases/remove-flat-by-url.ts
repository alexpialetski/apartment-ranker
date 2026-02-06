import type { IComparisonRepository } from "~/server/comparison/port/comparison.repository";
import { recalculateBandRatings } from "~/server/comparison/use-cases/recalculate-band-ratings";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface RemoveFlatByUrlDeps {
	flatRepo: IFlatRepository;
	comparisonRepo: IComparisonRepository;
	normalizeUrl: (url: string) => string;
}

export async function removeFlatByUrl(
	deps: RemoveFlatByUrlDeps,
	input: { realtUrl: string },
): Promise<{ deleted: boolean }> {
	const normalized = deps.normalizeUrl(input.realtUrl);

	// Find the flat before deletion to get its band
	const flat = await deps.flatRepo.findByRealtUrl(normalized);
	if (!flat) {
		return { deleted: false };
	}

	const band = flat.band ?? null;

	// Delete the flat
	const deleted = await deps.flatRepo.deleteByRealtUrl(normalized);
	if (!deleted) {
		return { deleted: false };
	}

	// Recalculate ratings for remaining flats in the band
	if (band !== null) {
		await recalculateBandRatings(
			{
				flatRepo: deps.flatRepo,
				comparisonRepo: deps.comparisonRepo,
			},
			band,
		);
	}

	return { deleted: true };
}
