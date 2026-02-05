import { eq, inArray, or } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { IComparisonRepository } from "~/server/comparison/port/comparison.repository";
import type * as schema from "~/server/shared/infrastructure/db/schema";
import { comparisons } from "~/server/shared/infrastructure/db/schema";

function toDate(value: Date | number | null | undefined): Date {
	if (value == null) return new Date(0);
	if (value instanceof Date) return value;
	return new Date(
		typeof value === "number" && value < 1e12 ? value * 1000 : value,
	);
}

export function createComparisonRepository(
	db: LibSQLDatabase<typeof schema>,
): IComparisonRepository {
	return {
		async create(winnerId: number, loserId: number) {
			const [row] = await db
				.insert(comparisons)
				.values({ winnerId, loserId })
				.returning();
			if (!row) throw new Error("Failed to create comparison");
			return {
				id: row.id,
				winnerId: row.winnerId,
				loserId: row.loserId,
				createdAt: toDate(row.createdAt),
			};
		},

		async countByFlatId(flatId: number) {
			const rows = await db
				.select({ id: comparisons.id })
				.from(comparisons)
				.where(
					or(eq(comparisons.winnerId, flatId), eq(comparisons.loserId, flatId)),
				);
			return rows.length;
		},

		async listByFlatIds(flatIds: number[]) {
			if (flatIds.length === 0) return [];
			const rows = await db
				.select({
					winnerId: comparisons.winnerId,
					loserId: comparisons.loserId,
				})
				.from(comparisons)
				.where(
					or(
						inArray(comparisons.winnerId, flatIds),
						inArray(comparisons.loserId, flatIds),
					),
				);
			return rows;
		},
	};
}
