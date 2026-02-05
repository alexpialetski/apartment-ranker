import { comparisonRouter } from "~/server/api/routers/comparison";
import { flatRouter } from "~/server/api/routers/flat";
import { rankRouter } from "~/server/api/routers/rank";
import {
	createCallerFactory,
	createTRPCRouter,
	publicProcedure,
} from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	health: publicProcedure.query(() => ({ ok: true })),
	flat: flatRouter,
	comparison: comparisonRouter,
	rank: rankRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 */
export const createCaller = createCallerFactory(appRouter);
