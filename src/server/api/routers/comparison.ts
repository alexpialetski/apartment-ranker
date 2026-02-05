import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { NotFoundError } from "~/server/comparison/use-cases/submit-comparison";

export const comparisonRouter = createTRPCRouter({
	getComparisonPair: publicProcedure
		.input(z.object({ band: z.string() }))
		.query(async ({ ctx, input }) => {
			const pair = await ctx.useCases.getComparisonPair(input);
			return pair;
		}),

	submitComparison: publicProcedure
		.input(
			z.object({
				winnerId: z.number(),
				loserId: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				return await ctx.useCases.submitComparison(input);
			} catch (err) {
				if (err instanceof NotFoundError) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: err.message,
					});
				}
				throw err;
			}
		}),

	getBands: publicProcedure.query(({ ctx }) => {
		return ctx.useCases.getBands();
	}),
});
