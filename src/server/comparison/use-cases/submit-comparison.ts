import type { IComparisonRepository } from "~/server/comparison/port/comparison.repository";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";
import { recalculateBandRatings } from "./recalculate-band-ratings";

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export interface SubmitComparisonDeps {
	flatRepo: IFlatRepository;
	comparisonRepo: IComparisonRepository;
}

export async function submitComparison(
	deps: SubmitComparisonDeps,
	input: { winnerId: number; loserId: number },
): Promise<{ ok: true }> {
	const { winnerId, loserId } = input;
	const [winner, loser] = await Promise.all([
		deps.flatRepo.findById(winnerId),
		deps.flatRepo.findById(loserId),
	]);
	if (!winner) throw new NotFoundError("Winner flat not found");
	if (!loser) throw new NotFoundError("Loser flat not found");

	await deps.comparisonRepo.create(winnerId, loserId);

	const band = winner.band ?? null;
	await recalculateBandRatings(deps, band);

	return { ok: true };
}
