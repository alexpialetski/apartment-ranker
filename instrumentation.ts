/**
 * Next.js instrumentation: runs once when the Node.js server starts.
 * We start the BullMQ worker here so it runs in the same process (dev/server).
 */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		try {
			const { startWorker } = await import("./src/server/app/worker");
			startWorker();
			console.log(
				"[apartment-ranker] Scrape worker started (listening for jobs)",
			);
		} catch (err) {
			console.error("[apartment-ranker] Failed to start scrape worker:", err);
		}
	}
}
