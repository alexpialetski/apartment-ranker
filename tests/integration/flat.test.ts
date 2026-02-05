import { TRPCError } from "@trpc/server";
import { beforeEach, expect, test } from "vitest";
import { createTestCaller, getTestDb, truncateTestDb } from "./helpers";

let caller: Awaited<ReturnType<typeof createTestCaller>>;

beforeEach(async () => {
	const db = await getTestDb();
	await truncateTestDb(db);
	caller = await createTestCaller();
});

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
