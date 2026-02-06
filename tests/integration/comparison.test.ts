import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { createComparisonRepository } from "~/server/comparison/adapter/drizzle-comparison.repository";
import { createFlatRepository } from "~/server/flat/adapter/drizzle-flat.repository";
import { createTestCaller, getTestDb, truncateTestDb } from "./helpers";

const BAND = "1-room_1800-1900";

let caller: Awaited<ReturnType<typeof createTestCaller>>;
let flatRepo: ReturnType<typeof createFlatRepository>;

beforeEach(async () => {
	const db = await getTestDb();
	await truncateTestDb(db);
	flatRepo = createFlatRepository(db);
	caller = await createTestCaller();
});

async function seedSuccessFlat(realtUrl: string, band: string = BAND) {
	const flat = await flatRepo.create({
		realtUrl,
		scrapeStatus: "scraping",
	});
	await flatRepo.update(flat.id, {
		scrapeStatus: "success",
		band,
	});
	const updated = await flatRepo.findById(flat.id);
	expect(updated).not.toBeNull();
	if (!updated) throw new Error("seed flat not found");
	return updated;
}

test("getComparisonPair returns null for empty band", async () => {
	const pair = await caller.comparison.getComparisonPair({
		band: BAND,
	});
	expect(pair).toBeNull();
});

test("getComparisonPair returns null when one flat in band", async () => {
	await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const pair = await caller.comparison.getComparisonPair({ band: BAND });
	expect(pair).toBeNull();
});

test("getComparisonPair returns pair when two+ flats in band", async () => {
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	const pair = await caller.comparison.getComparisonPair({ band: BAND });
	expect(pair).not.toBeNull();
	if (!pair) return;
	expect(pair.left).toBeDefined();
	expect(pair.right).toBeDefined();
	expect([pair.left.id, pair.right.id].sort()).toEqual([a.id, b.id].sort());
	expect(pair.left.band).toBe(BAND);
	expect(pair.right.band).toBe(BAND);
});

test("submitComparison not found throws NOT_FOUND", async () => {
	try {
		await caller.comparison.submitComparison({
			winnerId: 1,
			loserId: 2,
		});
		expect.fail("should throw");
	} catch (err) {
		expect(err).toBeInstanceOf(TRPCError);
		expect((err as TRPCError).code).toBe("NOT_FOUND");
	}
});

test("submitComparison happy path updates ratings", async () => {
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: b.id,
	});
	const winnerAfter = await flatRepo.findById(a.id);
	const loserAfter = await flatRepo.findById(b.id);
	expect(winnerAfter).not.toBeNull();
	expect(loserAfter).not.toBeNull();
	if (!winnerAfter || !loserAfter) return;
	expect(winnerAfter.eloRating).toBeGreaterThan(loserAfter.eloRating);
	expect(winnerAfter.ratingDeviation).not.toBe(350);
	expect(loserAfter.ratingDeviation).not.toBe(350);
	expect(winnerAfter.volatility).toBeDefined();
	expect(loserAfter.volatility).toBeDefined();
});

test("submitComparison Glicko-2 across band", async () => {
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	const c = await seedSuccessFlat("https://realt.by/sale/flats/3/");
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: b.id,
	});
	await caller.comparison.submitComparison({
		winnerId: b.id,
		loserId: c.id,
	});
	const comparisonRepo = createComparisonRepository(await getTestDb());
	const rows = await comparisonRepo.listByFlatIds([a.id, b.id, c.id]);
	expect(rows).toHaveLength(2);
	const flatA = await flatRepo.findById(a.id);
	const flatB = await flatRepo.findById(b.id);
	const flatC = await flatRepo.findById(c.id);
	expect(flatA).not.toBeNull();
	expect(flatB).not.toBeNull();
	expect(flatC).not.toBeNull();
	if (!flatA || !flatB || !flatC) return;
	expect(flatA.ratingDeviation).toBeLessThan(350);
	expect(flatB.ratingDeviation).toBeLessThan(350);
	expect(flatC.ratingDeviation).toBeLessThan(350);
});

test("getComparedPairKeys returns normalized keys", async () => {
	const db = await getTestDb();
	const comparisonRepo = createComparisonRepository(db);
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	const c = await seedSuccessFlat("https://realt.by/sale/flats/3/");

	// Create comparison A > B
	await comparisonRepo.create(a.id, b.id);
	// Create comparison C > A (order doesn't matter for keys)
	await comparisonRepo.create(c.id, a.id);

	const keys = await comparisonRepo.getComparedPairKeys([a.id, b.id, c.id]);
	expect(keys.size).toBe(2);
	expect(keys.has(`${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`)).toBe(
		true,
	);
	expect(keys.has(`${Math.min(a.id, c.id)}-${Math.max(a.id, c.id)}`)).toBe(
		true,
	);
	// Verify reverse order also normalizes correctly
	await comparisonRepo.create(b.id, c.id);
	const keysAfter = await comparisonRepo.getComparedPairKeys([
		a.id,
		b.id,
		c.id,
	]);
	expect(keysAfter.size).toBe(3);
	expect(keysAfter.has(`${Math.min(b.id, c.id)}-${Math.max(b.id, c.id)}`)).toBe(
		true,
	);
});

test("getComparisonPair excludes already-compared pairs", async () => {
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	const c = await seedSuccessFlat("https://realt.by/sale/flats/3/");
	const flatIds = [a.id, b.id, c.id];

	// Get first pair (should be one of: A-B, A-C, or B-C)
	const pair1 = await caller.comparison.getComparisonPair({ band: BAND });
	expect(pair1).not.toBeNull();
	if (!pair1) return;
	expect(flatIds).toContain(pair1.left.id);
	expect(flatIds).toContain(pair1.right.id);

	// Submit the comparison
	await caller.comparison.submitComparison({
		winnerId: pair1.left.id,
		loserId: pair1.right.id,
	});

	// Get next pair - should NOT be the same pair we just compared
	const pair2 = await caller.comparison.getComparisonPair({ band: BAND });
	expect(pair2).not.toBeNull();
	if (!pair2) return;

	// Verify it's a different pair
	const pair1Key = [
		Math.min(pair1.left.id, pair1.right.id),
		Math.max(pair1.left.id, pair1.right.id),
	].join("-");
	const pair2Key = [
		Math.min(pair2.left.id, pair2.right.id),
		Math.max(pair2.left.id, pair2.right.id),
	].join("-");
	expect(pair2Key).not.toBe(pair1Key);
});

test("getComparisonPair returns null when all pairs compared", async () => {
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	const c = await seedSuccessFlat("https://realt.by/sale/flats/3/");

	// Compare all 3 pairs: A-B, A-C, B-C
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: b.id,
	});
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: c.id,
	});
	await caller.comparison.submitComparison({
		winnerId: b.id,
		loserId: c.id,
	});

	// Should return null since all pairs are compared
	const pair = await caller.comparison.getComparisonPair({ band: BAND });
	expect(pair).toBeNull();
});

test("getComparisonPair still returns pair when only some pairs compared", async () => {
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/");
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/");
	const c = await seedSuccessFlat("https://realt.by/sale/flats/3/");

	// Compare only A-B
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: b.id,
	});

	// Should still return a pair (either A-C or B-C)
	const pair = await caller.comparison.getComparisonPair({ band: BAND });
	expect(pair).not.toBeNull();
	if (!pair) return;

	// Verify it's not the A-B pair we already compared
	const pairKey = [
		Math.min(pair.left.id, pair.right.id),
		Math.max(pair.left.id, pair.right.id),
	].join("-");
	const abKey = [Math.min(a.id, b.id), Math.max(a.id, b.id)].join("-");
	expect(pairKey).not.toBe(abKey);
	// Verify the returned pair is one of the remaining pairs: A-C or B-C
	const pairIds = [pair.left.id, pair.right.id];
	expect(pairIds).toContain(c.id);
	// The pair should be either A-C (contains a) or B-C (contains b), but not both
	expect(pairIds.includes(a.id) || pairIds.includes(b.id)).toBe(true);
});
