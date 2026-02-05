import { Glicko2 } from "glicko2";
import type { IComparisonRepository } from "~/server/comparison/port/comparison.repository";
import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

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

const DEFAULT_RD = 350;
const DEFAULT_VOLATILITY = 0.06;

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
	const bandFlats: Flat[] = band
		? await deps.flatRepo.listSuccessByBand(band)
		: [winner, loser];

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

	return { ok: true };
}
