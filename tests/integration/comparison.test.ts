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
