import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";
import type { IScrapeJobQueue } from "~/server/shared/port/scrape-job.queue";

export class AlreadyExistsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AlreadyExistsError";
	}
}

export interface AddFlatByUrlDeps {
	flatRepo: IFlatRepository;
	scrapeQueue: IScrapeJobQueue;
	normalizeUrl: (url: string) => string;
}

export async function addFlatByUrl(
	deps: AddFlatByUrlDeps,
	input: { realtUrl: string },
): Promise<Flat> {
	const normalized = deps.normalizeUrl(input.realtUrl);
	const existingActive = await deps.flatRepo.findByRealtUrl(normalized);
	if (existingActive) {
		throw new AlreadyExistsError("A flat with this URL already exists");
	}
	const existingAny =
		await deps.flatRepo.findByRealtUrlIncludingDeleted(normalized);
	if (existingAny && existingAny.deletedAt != null) {
		// Restore soft-deleted flat and re-scrape
		const restored = await deps.flatRepo.update(existingAny.id, {
			deletedAt: null,
			scrapeStatus: "scraping",
		});
		await deps.scrapeQueue.add(restored.id);
		return restored;
	}
	const flat = await deps.flatRepo.create({
		realtUrl: normalized,
		scrapeStatus: "scraping",
	});
	await deps.scrapeQueue.add(flat.id);
	return flat;
}
