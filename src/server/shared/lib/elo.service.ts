/**
 * Pure Elo rating computation. No DB; used by use cases that load/update via repository.
 * K = 32 by default.
 */

export function expectedScore(ratingA: number, ratingB: number): number {
	return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function computeNewRatings(
	winnerRating: number,
	loserRating: number,
	K = 32,
): { winnerRating: number; loserRating: number } {
	const expectedW = expectedScore(winnerRating, loserRating);
	const expectedL = expectedScore(loserRating, winnerRating);
	return {
		winnerRating: winnerRating + K * (1 - expectedW),
		loserRating: loserRating + K * (0 - expectedL),
	};
}
