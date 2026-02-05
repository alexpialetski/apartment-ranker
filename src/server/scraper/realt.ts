import * as cheerio from "cheerio";

/**
 * Scrape a Realt.by listing page for flat data.
 * Realt.by is a Next.js app: the listing is in <script id="__NEXT_DATA__"> as JSON
 * at props.pageProps.object (see scripts/apartment_scraper.py in personal/apartment-ranker).
 * No DB access; returns structured result.
 */

export interface ScrapedFlatData {
	price: number;
	pricePerSqm: number;
	rooms: number;
	location: string;
	area?: number;
}

export type ScrapeResult =
	| { success: true; data: ScrapedFlatData }
	| { success: false; error: string };

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** ISO 4217 code for USD */
const USD_CODE = "840";

interface NextDataObject {
	priceRates?: Record<string, number>;
	priceRatesPerM2?: Record<string, number>;
	rooms?: number;
	address?: string;
	areaTotal?: number;
	townDistrictName?: string;
	townSubDistrictName?: string;
	[key: string]: unknown;
}

function extractNextDataObject(html: string): NextDataObject | null {
	const $ = cheerio.load(html);
	const script = $("#__NEXT_DATA__").first();
	const raw = script.html() ?? "";
	if (!raw.trim()) return null;
	try {
		const data = JSON.parse(raw) as {
			props?: { pageProps?: { object?: NextDataObject } };
		};
		return data?.props?.pageProps?.object ?? null;
	} catch {
		return null;
	}
}

/**
 * Fetch and parse a Realt.by listing URL. Uses __NEXT_DATA__ JSON from the page.
 */
export async function scrapeRealtListing(url: string): Promise<ScrapeResult> {
	let html: string;
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
		const res = await fetch(url, {
			headers: { "User-Agent": USER_AGENT },
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!res.ok) {
			return { success: false, error: `HTTP ${res.status}` };
		}
		html = await res.text();
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { success: false, error: `Fetch failed: ${message}` };
	}

	const obj = extractNextDataObject(html);
	if (!obj) {
		return { success: false, error: "Could not find __NEXT_DATA__ on page" };
	}

	const priceUsd = obj.priceRates?.[USD_CODE];
	const pricePerSqmUsd = obj.priceRatesPerM2?.[USD_CODE];
	const rooms = obj.rooms;
	const address = obj.address?.trim();
	const areaTotal = obj.areaTotal;

	if (priceUsd == null || priceUsd <= 0) {
		return { success: false, error: "Missing or invalid price (USD)" };
	}
	if (rooms == null || rooms < 1 || rooms > 20) {
		return { success: false, error: "Missing or invalid room count" };
	}

	// Price per m² (USD): use API value if present, else derive from price and area
	let pricePerSqm: number;
	if (pricePerSqmUsd != null && pricePerSqmUsd > 0) {
		pricePerSqm = Math.round(pricePerSqmUsd * 100) / 100;
	} else if (areaTotal != null && areaTotal > 0) {
		pricePerSqm = Math.round((priceUsd / areaTotal) * 100) / 100;
	} else {
		return {
			success: false,
			error: "Cannot compute price per m² (no area or priceRatesPerM2)",
		};
	}

	// Location: address, or district + microdistrict
	const location =
		address ||
		[obj.townDistrictName, obj.townSubDistrictName]
			.filter(Boolean)
			.join(", ") ||
		"—";

	return {
		success: true,
		data: {
			price: priceUsd,
			pricePerSqm,
			rooms,
			location,
			...(areaTotal != null && areaTotal > 0 && { area: areaTotal }),
		},
	};
}
