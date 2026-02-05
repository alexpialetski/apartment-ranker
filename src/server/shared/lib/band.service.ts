import type { BandConfig } from "~/server/shared/config/bands";

/**
 * Returns a stable band identifier for a flat, or null if it doesn't fall in any band.
 * Band is stored as a string like "1-room_1800-1900".
 */
export function getBandLabel(
	rooms: number,
	pricePerSqm: number,
	config: BandConfig,
): string | null {
	const { roomCounts, priceBands } = config;
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
export function getAllBandLabels(config: BandConfig): string[] {
	const labels: string[] = [];
	for (const rooms of config.roomCounts) {
		for (const band of config.priceBands) {
			labels.push(`${rooms}-room_${band.label}`);
		}
	}
	return labels;
}
