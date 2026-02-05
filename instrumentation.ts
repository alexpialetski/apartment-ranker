/**
 * Next.js instrumentation: runs once when the Node.js server starts.
 * We start the BullMQ worker here so it runs in the same process (dev/server).
 */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		try {
			const { startWorker } = await import("./src/server/app/worker");
			const { createLogger } = await import("./src/server/shared/lib/logger");
			const log = createLogger("apartment-ranker");
			startWorker();
			log.info("Scrape worker started (listening for jobs)");
		} catch (err) {
			const { createLogger } = await import("./src/server/shared/lib/logger");
			createLogger("apartment-ranker").error(
				{ err },
				"Failed to start scrape worker",
			);
		}
	}
}
