import type { IFlatRepository } from "~/server/flat/port/flat.repository";
import type { IScrapeJobQueue } from "~/server/shared/port/scrape-job.queue";

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

export interface ReloadFlatDeps {
	flatRepo: IFlatRepository;
	scrapeQueue: IScrapeJobQueue;
}

export async function reloadFlat(
	deps: ReloadFlatDeps,
	input: { id: number },
): Promise<{ ok: true }> {
	const flat = await deps.flatRepo.findById(input.id);
	if (!flat) {
		throw new NotFoundError("Flat not found");
	}
	await deps.flatRepo.update(input.id, { scrapeStatus: "scraping" });
	await deps.scrapeQueue.add(input.id);
	return { ok: true };
}
