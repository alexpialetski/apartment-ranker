/**
 * Band definition for ranking: (room_count, price_per_sqm range).
 * Flats are compared and ranked only within the same band.
 * Prices in USD per m² (from Realt.by priceRatesPerM2["840"]).
 * Bands are 100 USD/m² steps (e.g. 1800-1900, 1900-2000, 2000-2100).
 */

export interface PriceBand {
	/** Label segment for price range, e.g. "1800-1900" */
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

const BAND_STEP = 100;
const BAND_MIN = 1800;
const BAND_MAX = 3100;

function buildPriceBands(): PriceBand[] {
	const bands: PriceBand[] = [];
	for (let min = BAND_MIN; min < BAND_MAX; min += BAND_STEP) {
		const max = min + BAND_STEP;
		bands.push({
			label: `${min}-${max}`,
			minPricePerSqm: min,
			maxPricePerSqm: max,
		});
	}
	return bands;
}

const DEFAULT_BAND_CONFIG: BandConfig = {
	roomCounts: [1, 2, 3],
	priceBands: buildPriceBands(),
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
 * Band is stored in the DB as a string like "1-room_1800-1900".
 *
 * @example getBandLabel(1, 1850) => "1-room_1800-1900"
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
