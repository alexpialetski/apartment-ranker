import IORedis from "ioredis";
import type { NextRequest } from "next/server";

import { env } from "~/env";
import { SCRAPE_EVENTS_CHANNEL } from "~/server/shared/infrastructure/sse/scrape-events";
import { createLogger } from "~/server/shared/lib/logger";

const log = createLogger("sse");

/**
 * Server-Sent Events endpoint for scrape job completion.
 * Subscribes via Redis so events from the worker (possibly another process) are received.
 */
export async function GET(request: NextRequest) {
	const stream = new ReadableStream({
		start(controller) {
			log.debug("SSE client connected");
			const encoder = new TextEncoder();

			const sendData = (data: unknown) => {
				try {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
					);
				} catch {
					// Stream may be closed
				}
			};

			const subscriber = new IORedis(env.REDIS_URL, {
				maxRetriesPerRequest: null,
			});
			subscriber.subscribe(SCRAPE_EVENTS_CHANNEL, (err) => {
				if (err) log.error({ err }, "Redis subscribe error");
			});
			subscriber.on("message", (_channel, message) => {
				try {
					const event = JSON.parse(message as string) as unknown;
					sendData(event);
				} catch {
					// ignore parse errors
				}
			});

			// Keep-alive as SSE comment (no client parsing needed)
			const keepAlive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(`: ${Date.now()}\n\n`));
				} catch {
					// Stream may be closed
				}
			}, 30_000);

			const cleanup = () => {
				log.debug("SSE client disconnected");
				clearInterval(keepAlive);
				subscriber.unsubscribe(SCRAPE_EVENTS_CHANNEL);
				subscriber.quit().catch(() => {});
				try {
					controller.close();
				} catch {
					// already closed
				}
			};

			request.signal?.addEventListener("abort", cleanup);
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no",
		},
	});
}
