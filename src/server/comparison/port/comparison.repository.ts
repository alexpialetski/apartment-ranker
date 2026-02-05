import type { Comparison } from "~/server/comparison/domain/comparison";

export interface IComparisonRepository {
	create(winnerId: number, loserId: number): Promise<Comparison>;
	countByFlatId(flatId: number): Promise<number>;
	/** All comparisons where either winner or loser is in flatIds. */
	listByFlatIds(
		flatIds: number[],
	): Promise<{ winnerId: number; loserId: number }[]>;
}
