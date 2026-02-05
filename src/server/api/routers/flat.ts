import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { flats } from "~/server/db/schema";
import { getScrapeFlatsQueue } from "~/server/queue";
import { normalizeRealtUrl } from "~/server/utils/normalize-realt-url";

export const flatRouter = createTRPCRouter({
	addByUrl: publicProcedure
		.input(z.object({ realtUrl: z.string().url() }))
		.mutation(async ({ ctx, input }) => {
			const normalized = normalizeRealtUrl(input.realtUrl);

			const existing = await ctx.db.query.flats.findFirst({
				where: eq(flats.realtUrl, normalized),
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "A flat with this URL already exists",
				});
			}

			const [inserted] = await ctx.db
				.insert(flats)
				.values({
					realtUrl: normalized,
					scrapeStatus: "scraping",
				})
				.returning();

			if (!inserted) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create flat",
				});
			}

			const queue = getScrapeFlatsQueue();
			await queue.add("scrape", { flatId: inserted.id });

			return inserted;
		}),

	removeByUrl: publicProcedure
		.input(z.object({ realtUrl: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const normalized = normalizeRealtUrl(input.realtUrl);

			const deleted = await ctx.db
				.delete(flats)
				.where(eq(flats.realtUrl, normalized))
				.returning({ id: flats.id });

			return { deleted: deleted.length > 0 };
		}),

	listFlats: publicProcedure.query(async ({ ctx }) => {
		return ctx.db.query.flats.findMany({
			orderBy: [desc(flats.createdAt)],
		});
	}),

	getFlat: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ ctx, input }) => {
			const flat = await ctx.db.query.flats.findFirst({
				where: eq(flats.id, input.id),
			});
			return flat ?? null;
		}),

	reloadFlat: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			const flat = await ctx.db.query.flats.findFirst({
				where: eq(flats.id, input.id),
			});
			if (!flat) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Flat not found",
				});
			}

			await ctx.db
				.update(flats)
				.set({ scrapeStatus: "scraping" })
				.where(eq(flats.id, input.id));

			const queue = getScrapeFlatsQueue();
			await queue.add("scrape", { flatId: input.id });

			return { ok: true };
		}),
});
