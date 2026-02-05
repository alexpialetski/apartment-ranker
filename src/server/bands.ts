/**
 * Band definition for ranking: (room_count, price_per_sqm range).
 * Flats are compared and ranked only within the same band.
 * Prices in BYN per m² (Minsk, Realt.by).
 */

export interface PriceBand {
	/** Label segment for price range, e.g. "1.5-1.8k" */
	label: string;
	minPricePerSqm: number;
	maxPricePerSqm: number;
}

export interface BandConfig {
	/** Supported room counts */
	roomCounts: number[];
	/** Price-per-m² bands (same for all room counts) */
	priceBands: PriceBand[];
}

const DEFAULT_BAND_CONFIG: BandConfig = {
	roomCounts: [1, 2, 3],
	priceBands: [
		{ label: "1.5-1.8k", minPricePerSqm: 1500, maxPricePerSqm: 1800 },
		{ label: "1.8-2k", minPricePerSqm: 1800, maxPricePerSqm: 2000 },
		{ label: "2-2.2k", minPricePerSqm: 2000, maxPricePerSqm: 2200 },
		{ label: "2.2-2.5k", minPricePerSqm: 2200, maxPricePerSqm: 2500 },
	],
};

/** Band config used by getBandLabel. Can be overridden for tests. */
let bandConfig: BandConfig = DEFAULT_BAND_CONFIG;

export function getBandConfig(): BandConfig {
	return bandConfig;
}

export function setBandConfig(config: BandConfig): void {
	bandConfig = config;
}

/**
 * Returns a stable band identifier for a flat, or null if it doesn't fall in any band.
 * Used when saving a scraped flat and for grouping in Compare/Rank.
 *
 * @example getBandLabel(1, 1700) => "1-room_1.5-1.8k"
 */
export function getBandLabel(
	rooms: number,
	pricePerSqm: number,
): string | null {
	const { roomCounts, priceBands } = bandConfig;
	if (!roomCounts.includes(rooms)) return null;

	const band = priceBands.find(
		(b) => pricePerSqm >= b.minPricePerSqm && pricePerSqm < b.maxPricePerSqm,
	);
	if (!band) return null;

	return `${rooms}-room_${band.label}`;
}

/**
 * All possible band labels (for API / band selector in Compare).
 * Order: by room count, then by price range.
 */
export function getAllBandLabels(): string[] {
	const labels: string[] = [];
	for (const rooms of bandConfig.roomCounts) {
		for (const band of bandConfig.priceBands) {
			labels.push(`${rooms}-room_${band.label}`);
		}
	}
	return labels;
}
