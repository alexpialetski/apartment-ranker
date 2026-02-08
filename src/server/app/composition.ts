import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { createComparisonRepository } from "~/server/comparison/adapter/drizzle-comparison.repository";
import type { ComparisonPair } from "~/server/comparison/use-cases/get-comparison-pair";
import * as getComparisonPairUC from "~/server/comparison/use-cases/get-comparison-pair";
import * as submitComparisonUC from "~/server/comparison/use-cases/submit-comparison";
import { createFlatRepository } from "~/server/flat/adapter/drizzle-flat.repository";
import type { Flat } from "~/server/flat/domain/flat";
import * as addFlatByUrlUC from "~/server/flat/use-cases/add-flat-by-url";
import * as getFlatUC from "~/server/flat/use-cases/get-flat";
import * as listFlatsUC from "~/server/flat/use-cases/list-flats";
import * as reloadAllFlatsUC from "~/server/flat/use-cases/reload-all-flats";
import * as reloadFlatUC from "~/server/flat/use-cases/reload-flat";
import * as removeFlatByUrlUC from "~/server/flat/use-cases/remove-flat-by-url";
import type { BandRanking } from "~/server/ranking/use-cases/get-ranked-flats";
import * as getRankedFlatsUC from "~/server/ranking/use-cases/get-ranked-flats";
import { createScrapeJobQueue } from "~/server/scraping/adapter/bullmq-scrape-job.queue";
import { createRealtScraperAdapter } from "~/server/scraping/adapter/realt-scraper.adapter";
import { createScrapeEventPublisher } from "~/server/scraping/adapter/sse-scrape-event-publisher";
import * as processScrapeJobUC from "~/server/scraping/use-cases/process-scrape-job";
import { getBandConfig } from "~/server/shared/config/bands";
import { db } from "~/server/shared/infrastructure/db";
import type * as schema from "~/server/shared/infrastructure/db/schema";
import {
	getAllBandLabels as getAllBandLabelsDomain,
	getBandLabel as getBandLabelDomain,
} from "~/server/shared/lib/band.service";
import type { IScrapeJobQueue } from "~/server/shared/port/scrape-job.queue";
import { normalizeRealtUrl } from "~/server/shared/utils/normalize-realt-url";

export interface BuildUseCasesDeps {
	db?: LibSQLDatabase<typeof schema>;
	scrapeQueue?: IScrapeJobQueue;
}

let useCases: UseCasesContainer | null = null;

export interface UseCasesContainer {
	addFlatByUrl: (input: { realtUrl: string }) => Promise<Flat>;
	removeFlatByUrl: (input: {
		realtUrl: string;
	}) => Promise<{ deleted: boolean }>;
	listFlats: () => Promise<Flat[]>;
	getFlat: (input: { id: number }) => Promise<Flat | null>;
	reloadFlat: (input: { id: number }) => Promise<{ ok: true }>;
	reloadAllFlats: () => Promise<{ queued: number }>;
	processScrapeJob: (input: { flatId: number }) => Promise<void>;
	getComparisonPair: (input: {
		band?: string;
	}) => Promise<ComparisonPair | null>;
	submitComparison: (input: {
		winnerId: number;
		loserId: number;
	}) => Promise<{ ok: true }>;
	getRankedFlats: () => Promise<BandRanking[]>;
	getBands: () => string[];
}

export function buildUseCases(deps?: BuildUseCasesDeps): UseCasesContainer {
	const database = deps?.db ?? db;
	const flatRepo = createFlatRepository(database);
	const comparisonRepo = createComparisonRepository(database);
	const scrapeQueue = deps?.scrapeQueue ?? createScrapeJobQueue();
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
				{ flatRepo, comparisonRepo, normalizeUrl: normalizeRealtUrl },
				input,
			),
		listFlats: () => listFlatsUC.listFlats({ flatRepo }),
		getFlat: (input) => getFlatUC.getFlat({ flatRepo }, input),
		reloadFlat: (input) =>
			reloadFlatUC.reloadFlat({ flatRepo, scrapeQueue }, input),
		reloadAllFlats: () =>
			reloadAllFlatsUC.reloadAllFlats({ flatRepo, scrapeQueue }),
		processScrapeJob: (input) =>
			processScrapeJobUC.processScrapeJob(
				{ flatRepo, scraper, eventPublisher, getBandLabel },
				input,
			),
		getComparisonPair: (input) =>
			getComparisonPairUC.getComparisonPair(
				{ flatRepo, comparisonRepo, getAllBandLabels },
				input,
			),
		submitComparison: (input) =>
			submitComparisonUC.submitComparison({ flatRepo, comparisonRepo }, input),
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
		useCases = buildUseCases(undefined);
	}
	return useCases;
}
