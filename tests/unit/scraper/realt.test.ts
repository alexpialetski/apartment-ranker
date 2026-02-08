import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { scrapeRealtListing } from "~/server/shared/infrastructure/scraper/realt";

function makeNextDataHtml(object: Record<string, unknown>): string {
	const json = JSON.stringify({
		props: { pageProps: { object } },
	});
	return `<!DOCTYPE html><html><body><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`;
}

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve({
				ok: true,
				text: () => Promise.resolve(""),
			}),
		),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test("scrapeRealtListing returns listedAt when createdAt is valid ISO string", async () => {
	const createdAt = "2025-09-28T22:41:31+03:00";
	const html = makeNextDataHtml({
		priceRates: { "840": 108_000 },
		priceRatesPerM2: { "840": 1993 },
		rooms: 2,
		address: "Минск Одинцова ул. 119",
		areaTotal: 54.2,
		createdAt,
	});

	(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		ok: true,
		text: () => Promise.resolve(html),
	});

	const result = await scrapeRealtListing("https://realt.by/sale/flats/123/");

	expect(result.success).toBe(true);
	if (result.success) {
		expect(result.data.listedAt).toBe(createdAt);
		expect(result.data.price).toBe(108_000);
		expect(result.data.rooms).toBe(2);
	}
});

test("scrapeRealtListing omits listedAt when createdAt is invalid", async () => {
	const html = makeNextDataHtml({
		priceRates: { "840": 50_000 },
		priceRatesPerM2: { "840": 1500 },
		rooms: 1,
		address: "Test",
		areaTotal: 33,
		createdAt: "not-a-date",
	});

	(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		ok: true,
		text: () => Promise.resolve(html),
	});

	const result = await scrapeRealtListing("https://realt.by/sale/flats/456/");

	expect(result.success).toBe(true);
	if (result.success) {
		expect(result.data.listedAt).toBeUndefined();
	}
});

test("scrapeRealtListing omits listedAt when createdAt is missing", async () => {
	const html = makeNextDataHtml({
		priceRates: { "840": 50_000 },
		priceRatesPerM2: { "840": 1500 },
		rooms: 1,
		address: "Test",
		areaTotal: 33,
	});

	(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
		ok: true,
		text: () => Promise.resolve(html),
	});

	const result = await scrapeRealtListing("https://realt.by/sale/flats/789/");

	expect(result.success).toBe(true);
	if (result.success) {
		expect(result.data.listedAt).toBeUndefined();
	}
});
