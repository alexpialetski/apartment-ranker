import { getBandConfig } from "~/server/shared/config/bands";
import {
	getAllBandLabels as getAllBandLabelsDomain,
	getBandLabel as getBandLabelDomain,
} from "~/server/shared/lib/band.service";
import type { Flat } from "~/server/flat/domain/flat";
import type { BandRanking } from "~/server/ranking/use-cases/get-ranked-flats";
import type { ComparisonPair } from "~/server/comparison/use-cases/get-comparison-pair";
import { createComparisonRepository } from "~/server/comparison/adapter/drizzle-comparison.repository";
import { createFlatRepository } from "~/server/flat/adapter/drizzle-flat.repository";
import { createScrapeJobQueue } from "~/server/scraping/adapter/bullmq-scrape-job.queue";
import { createRealtScraperAdapter } from "~/server/scraping/adapter/realt-scraper.adapter";
import { createScrapeEventPublisher } from "~/server/scraping/adapter/sse-scrape-event-publisher";
import { db } from "~/server/shared/infrastructure/db";
import { normalizeRealtUrl } from "~/server/shared/utils/normalize-realt-url";
import * as addFlatByUrlUC from "~/server/flat/use-cases/add-flat-by-url";
import * as getComparisonPairUC from "~/server/comparison/use-cases/get-comparison-pair";
import * as getFlatUC from "~/server/flat/use-cases/get-flat";
import * as getRankedFlatsUC from "~/server/ranking/use-cases/get-ranked-flats";
import * as listFlatsUC from "~/server/flat/use-cases/list-flats";
import * as processScrapeJobUC from "~/server/scraping/use-cases/process-scrape-job";
import * as reloadFlatUC from "~/server/flat/use-cases/reload-flat";
import * as removeFlatByUrlUC from "~/server/flat/use-cases/remove-flat-by-url";
import * as submitComparisonUC from "~/server/comparison/use-cases/submit-comparison";

let useCases: UseCasesContainer | null = null;

export interface UseCasesContainer {
	addFlatByUrl: (input: { realtUrl: string }) => Promise<Flat>;
	removeFlatByUrl: (input: { realtUrl: string }) => Promise<{ deleted: boolean }>;
	listFlats: () => Promise<Flat[]>;
	getFlat: (input: { id: number }) => Promise<Flat | null>;
	reloadFlat: (input: { id: number }) => Promise<{ ok: true }>;
	processScrapeJob: (input: { flatId: number }) => Promise<void>;
	getComparisonPair: (input: { band: string }) => Promise<ComparisonPair | null>;
	submitComparison: (input: {
		winnerId: number;
		loserId: number;
	}) => Promise<{ ok: true }>;
	getRankedFlats: () => Promise<BandRanking[]>;
	getBands: () => string[];
}

function buildUseCases(): UseCasesContainer {
	const flatRepo = createFlatRepository(db);
	const comparisonRepo = createComparisonRepository(db);
	const scrapeQueue = createScrapeJobQueue();
	const scraper = createRealtScraperAdapter();
	const eventPublisher = createScrapeEventPublisher();
	const bandConfig = getBandConfig();
	const getBandLabel = (rooms: number, pricePerSqm: number) =>
		getBandLabelDomain(rooms, pricePerSqm, bandConfig);
	const getAllBandLabels = () => getAllBandLabelsDomain(bandConfig);

	return {
		addFlatByUrl: (input) =>
			addFlatByUrlUC.addFlatByUrl(
				{ flatRepo, scrapeQueue, normalizeUrl: normalizeRealtUrl },
				input,
			),
		removeFlatByUrl: (input) =>
			removeFlatByUrlUC.removeFlatByUrl(
				{ flatRepo, normalizeUrl: normalizeRealtUrl },
				input,
			),
		listFlats: () => listFlatsUC.listFlats({ flatRepo }),
		getFlat: (input) => getFlatUC.getFlat({ flatRepo }, input),
		reloadFlat: (input) =>
			reloadFlatUC.reloadFlat({ flatRepo, scrapeQueue }, input),
		processScrapeJob: (input) =>
			processScrapeJobUC.processScrapeJob(
				{ flatRepo, scraper, eventPublisher, getBandLabel },
				input,
			),
		getComparisonPair: (input) =>
			getComparisonPairUC.getComparisonPair({ flatRepo }, input),
		submitComparison: (input) =>
			submitComparisonUC.submitComparison(
				{ flatRepo, comparisonRepo },
				input,
			),
		getRankedFlats: () =>
			getRankedFlatsUC.getRankedFlats({
				flatRepo,
				getAllBandLabels,
			}),
		getBands: getAllBandLabels,
	};
}

export function getUseCases(): UseCasesContainer {
	if (!useCases) {
		useCases = buildUseCases();
	}
	return useCases;
}
