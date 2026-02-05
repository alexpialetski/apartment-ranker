import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { AlreadyExistsError } from "~/server/flat/use-cases/add-flat-by-url";
import { NotFoundError as ReloadNotFoundError } from "~/server/flat/use-cases/reload-flat";

export const flatRouter = createTRPCRouter({
	addByUrl: publicProcedure
		.input(z.object({ realtUrl: z.string().url() }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await ctx.useCases.addFlatByUrl(input);
			} catch (err) {
				if (err instanceof AlreadyExistsError) {
					throw new TRPCError({
						code: "CONFLICT",
						message: err.message,
					});
				}
				throw err;
			}
		}),

	removeByUrl: publicProcedure
		.input(z.object({ realtUrl: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.useCases.removeFlatByUrl(input);
		}),

	listFlats: publicProcedure.query(async ({ ctx }) => {
		return ctx.useCases.listFlats();
	}),

	getFlat: publicProcedure
		.input(z.object({ id: z.number() }))
		.query(async ({ ctx, input }) => {
			return ctx.useCases.getFlat(input);
		}),

	reloadFlat: publicProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			try {
				return await ctx.useCases.reloadFlat(input);
			} catch (err) {
				if (err instanceof ReloadNotFoundError) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: err.message,
					});
				}
				throw err;
			}
		}),
});
