import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const rankRouter = createTRPCRouter({
	getRankedFlats: publicProcedure
		.input(
			z
				.object({
					band: z.string().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const bands = await ctx.useCases.getRankedFlats();
			if (input?.band) {
				const filtered = bands.filter((b) => b.band === input.band);
				return filtered;
			}
			return bands;
		}),
});
