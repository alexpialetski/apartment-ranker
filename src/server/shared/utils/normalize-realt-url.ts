/**
 * Normalize Realt.by URL so add/remove by URL match consistently.
 * Strip trailing slash, use canonical origin, optional: drop irrelevant query params.
 */
export function normalizeRealtUrl(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) return trimmed;

	try {
		const url = new URL(trimmed);
		// Keep only pathname and optionally essential params; drop tracking params
		url.search = "";
		let path = url.pathname;
		if (path.endsWith("/") && path.length > 1) {
			path = path.slice(0, -1);
		}
		url.pathname = path;
		return url.href;
	} catch {
		return trimmed;
	}
}
