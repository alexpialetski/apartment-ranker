import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { createFlatRepository } from "~/server/flat/adapter/drizzle-flat.repository";
import { normalizeRealtUrl } from "~/server/shared/utils/normalize-realt-url";
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
	// Normalize URL to match how the app stores them
	const normalizedUrl = normalizeRealtUrl(realtUrl);
	const flat = await flatRepo.create({
		realtUrl: normalizedUrl,
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

test("listFlats returns empty array when no flats", async () => {
	const caller = await createTestCaller();
	const list = await caller.flat.listFlats();
	expect(list).toEqual([]);
});

test("addFlatByUrl then list returns one flat with defaults", async () => {
	const url = "https://realt.by/sale/flats/123/";
	await caller.flat.addByUrl({ realtUrl: url });
	const list = await caller.flat.listFlats();
	expect(list).toHaveLength(1);
	// URL is normalized (e.g. trailing slash removed)
	expect(list[0]?.realtUrl).toBeDefined();
	expect(list[0]?.realtUrl?.startsWith("https://realt.by/sale/flats/123")).toBe(
		true,
	);
	expect(list[0]).toMatchObject({
		scrapeStatus: "scraping",
		eloRating: 1500,
	});
	expect(list[0]?.ratingDeviation).toBeDefined();
	expect(list[0]?.volatility).toBeDefined();
});

test("addFlatByUrl duplicate throws CONFLICT", async () => {
	const url = "https://realt.by/sale/flats/456/";
	await caller.flat.addByUrl({ realtUrl: url });
	try {
		await caller.flat.addByUrl({ realtUrl: url });
		expect.fail("should throw");
	} catch (err) {
		expect(err).toBeInstanceOf(TRPCError);
		expect((err as TRPCError).code).toBe("CONFLICT");
	}
});

test("getFlat returns flat when found", async () => {
	const url = "https://realt.by/sale/flats/789/";
	const added = await caller.flat.addByUrl({ realtUrl: url });
	const found = await caller.flat.getFlat({ id: added.id });
	expect(found).not.toBeNull();
	expect(found?.id).toBe(added.id);
	// URL is normalized by the app (e.g. trailing slash removed)
	expect(found?.realtUrl?.startsWith("https://realt.by/sale/flats/789")).toBe(
		true,
	);
});

test("getFlat returns null when not found", async () => {
	const found = await caller.flat.getFlat({ id: 99999 });
	expect(found).toBeNull();
});

test("removeByUrl soft-deletes flat", async () => {
	const url = "https://realt.by/sale/flats/remove-me/";
	await caller.flat.addByUrl({ realtUrl: url });
	const listBefore = await caller.flat.listFlats();
	expect(listBefore).toHaveLength(1);
	const result = await caller.flat.removeByUrl({ realtUrl: url });
	expect(result.deleted).toBe(true);
	const listAfter = await caller.flat.listFlats();
	expect(listAfter).toHaveLength(0);
});

test("removeByUrl recalculates ratings for remaining flats in band", async () => {
	// Create three flats in the same band
	const a = await seedSuccessFlat("https://realt.by/sale/flats/1/", BAND);
	const b = await seedSuccessFlat("https://realt.by/sale/flats/2/", BAND);
	const c = await seedSuccessFlat("https://realt.by/sale/flats/3/", BAND);

	// Add comparisons: A > B, B > C, and A > C (so A and C have a direct comparison)
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: b.id,
	});
	await caller.comparison.submitComparison({
		winnerId: b.id,
		loserId: c.id,
	});
	await caller.comparison.submitComparison({
		winnerId: a.id,
		loserId: c.id,
	});

	// Get ratings after comparisons
	const aBefore = await flatRepo.findById(a.id);
	const bBefore = await flatRepo.findById(b.id);
	const cBefore = await flatRepo.findById(c.id);
	expect(aBefore).not.toBeNull();
	expect(bBefore).not.toBeNull();
	expect(cBefore).not.toBeNull();
	if (!aBefore || !bBefore || !cBefore) return;

	// Verify ratings changed from defaults
	expect(aBefore.eloRating).toBeGreaterThan(1500);
	expect(aBefore.ratingDeviation).toBeLessThan(350);
	expect(cBefore.eloRating).toBeLessThan(1500);
	expect(cBefore.ratingDeviation).toBeLessThan(350);

	// Store A and C ratings before deletion
	const aRatingBefore = aBefore.eloRating;
	const cRatingBefore = cBefore.eloRating;

	// Delete flat B
	const result = await caller.flat.removeByUrl({ realtUrl: b.realtUrl });
	expect(result.deleted).toBe(true);

	// Verify B is deleted
	const bAfter = await flatRepo.findById(b.id);
	expect(bAfter).toBeNull();

	// Verify A and C ratings are recalculated (without B's comparisons)
	const aAfter = await flatRepo.findById(a.id);
	const cAfter = await flatRepo.findById(c.id);
	expect(aAfter).not.toBeNull();
	expect(cAfter).not.toBeNull();
	if (!aAfter || !cAfter) return;

	// After recalculation, A and C should still have their direct comparison (A > C)
	// but comparisons involving B (A > B and B > C) are excluded
	// So ratings should change from before deletion
	expect(aAfter.eloRating).not.toBe(aRatingBefore);
	expect(cAfter.eloRating).not.toBe(cRatingBefore);

	// A should still be rated higher than C (since A > C comparison remains)
	expect(aAfter.eloRating).toBeGreaterThan(cAfter.eloRating);

	// Verify rating deviation and volatility are still updated
	expect(aAfter.ratingDeviation).toBeDefined();
	expect(cAfter.ratingDeviation).toBeDefined();
	expect(aAfter.volatility).toBeDefined();
	expect(cAfter.volatility).toBeDefined();
});

test("removeByUrl skips recalculation when flat has no band", async () => {
	// Create a flat without a band (band is null)
	// Normalize URL to match how the app stores them
	const normalizedUrl = normalizeRealtUrl(
		"https://realt.by/sale/flats/no-band/",
	);
	const flat = await flatRepo.create({
		realtUrl: normalizedUrl,
		scrapeStatus: "success",
	});
	await flatRepo.update(flat.id, {
		scrapeStatus: "success",
		band: null,
	});

	const result = await caller.flat.removeByUrl({
		realtUrl: flat.realtUrl,
	});
	expect(result.deleted).toBe(true);

	// Verify flat is deleted
	const deleted = await flatRepo.findById(flat.id);
	expect(deleted).toBeNull();
});

test("reloadFlat not found throws NOT_FOUND", async () => {
	await expect(caller.flat.reloadFlat({ id: 99999 })).rejects.toThrow(
		TRPCError,
	);
	try {
		await caller.flat.reloadFlat({ id: 99999 });
	} catch (err) {
		expect(err).toBeInstanceOf(TRPCError);
		expect((err as TRPCError).code).toBe("NOT_FOUND");
	}
});
