import * as cheerio from "cheerio";

import type { ScrapeResult } from "~/server/shared/lib/scrape-result";

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
	/** ISO date when listing was created (date when flat was listed for sale). */
	createdAt?: string;
	townDistrictName?: string;
	townSubDistrictName?: string;
	/** First photo URL for card thumbnail. Realt.by may use photos array or single image field. */
	photos?: Array<{ url?: string; imageUrl?: string }>;
	photo?: { url?: string };
	imageUrl?: string;
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

	// First image URL for card thumbnail
	const imageUrl =
		typeof obj.imageUrl === "string" && obj.imageUrl.trim()
			? obj.imageUrl.trim()
			: (obj.photos?.[0]?.url ?? obj.photos?.[0]?.imageUrl ?? obj.photo?.url);

	// Listed date: Realt.by createdAt (valid ISO string only)
	const listedAt =
		typeof obj.createdAt === "string" && obj.createdAt.trim()
			? (() => {
					const d = new Date(obj.createdAt);
					return Number.isFinite(d.getTime())
						? obj.createdAt.trim()
						: undefined;
				})()
			: undefined;

	return {
		success: true,
		data: {
			price: priceUsd,
			pricePerSqm,
			rooms,
			location,
			...(areaTotal != null && areaTotal > 0 && { area: areaTotal }),
			...(typeof imageUrl === "string" && imageUrl && { imageUrl }),
			...(listedAt != null && { listedAt }),
		},
	};
}

export type {
	ScrapedFlatData,
	ScrapeResult,
} from "~/server/shared/lib/scrape-result";
