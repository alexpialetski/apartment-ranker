import type { Comparison } from "~/server/comparison/domain/comparison";

export interface IComparisonRepository {
	create(winnerId: number, loserId: number): Promise<Comparison>;
	countByFlatId(flatId: number): Promise<number>;
	/** All comparisons where either winner or loser is in flatIds. */
	listByFlatIds(
		flatIds: number[],
	): Promise<{ winnerId: number; loserId: number }[]>;
	/**
	 * Returns a Set of normalized pair keys for all compared pairs involving the given flatIds.
	 * Each key is "minId-maxId" so (a, b) and (b, a) map to the same key.
	 */
	getComparedPairKeys(flatIds: number[]): Promise<Set<string>>;
}
