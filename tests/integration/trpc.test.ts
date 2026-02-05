import { beforeEach, expect, test } from "vitest";
import { createTestCaller, getTestDb, truncateTestDb } from "./helpers";

let caller: Awaited<ReturnType<typeof createTestCaller>>;

beforeEach(async () => {
	const db = await getTestDb();
	await truncateTestDb(db);
	caller = await createTestCaller();
});

test("health returns ok true", async () => {
	const result = await caller.health();
	expect(result).toEqual({ ok: true });
});

test("getBands returns array of band labels", async () => {
	const bands = await caller.comparison.getBands();
	expect(Array.isArray(bands)).toBe(true);
	expect(bands.length).toBeGreaterThan(0);
	expect(bands).toContain("1-room_1800-1900");
});
