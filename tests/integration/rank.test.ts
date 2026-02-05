import { beforeEach, expect, test } from "vitest";
import { createFlatRepository } from "~/server/flat/adapter/drizzle-flat.repository";
import { createTestCaller, getTestDb, truncateTestDb } from "./helpers";

const BAND1 = "1-room_1800-1900";
const BAND2 = "2-room_1900-2000";

let caller: Awaited<ReturnType<typeof createTestCaller>>;
let flatRepo: ReturnType<typeof createFlatRepository>;

beforeEach(async () => {
	const db = await getTestDb();
	await truncateTestDb(db);
	flatRepo = createFlatRepository(db);
	caller = await createTestCaller();
});

async function seedSuccessFlat(realtUrl: string, band: string) {
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

test("getRankedFlats returns empty when no success flats", async () => {
	const bands = await caller.rank.getRankedFlats();
	expect(bands).toEqual([]);
});

test("getRankedFlats returns one band with two flats ordered by eloRating", async () => {
	const f1 = await seedSuccessFlat("https://realt.by/sale/flats/1/", BAND1);
	const f2 = await seedSuccessFlat("https://realt.by/sale/flats/2/", BAND1);
	await flatRepo.update(f1.id, { eloRating: 1600 });
	await flatRepo.update(f2.id, { eloRating: 1400 });
	const bands = await caller.rank.getRankedFlats();
	expect(bands).toHaveLength(1);
	expect(bands[0]?.band).toBe(BAND1);
	expect(bands[0]?.flats).toHaveLength(2);
	expect(bands[0]?.flats[0]?.eloRating).toBe(1600);
	expect(bands[0]?.flats[1]?.eloRating).toBe(1400);
});

test("getRankedFlats returns multiple bands", async () => {
	await seedSuccessFlat("https://realt.by/sale/flats/1/", BAND1);
	await seedSuccessFlat("https://realt.by/sale/flats/2/", BAND2);
	const bands = await caller.rank.getRankedFlats();
	expect(bands.length).toBeGreaterThanOrEqual(2);
	const bandLabels = bands.map((b) => b.band);
	expect(bandLabels).toContain(BAND1);
	expect(bandLabels).toContain(BAND2);
});

test("getRankedFlats filter by band returns only that band", async () => {
	await seedSuccessFlat("https://realt.by/sale/flats/1/", BAND1);
	await seedSuccessFlat("https://realt.by/sale/flats/2/", BAND2);
	const filtered = await caller.rank.getRankedFlats({ band: BAND1 });
	expect(filtered).toHaveLength(1);
	expect(filtered[0]?.band).toBe(BAND1);
	expect(filtered[0]?.flats).toHaveLength(1);
});

test("getRankedFlats filter by band returns empty when no flats in band", async () => {
	const filtered = await caller.rank.getRankedFlats({
		band: "1-room_1700-1800",
	});
	expect(filtered).toEqual([]);
});
