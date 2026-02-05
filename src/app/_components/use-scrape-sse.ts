"use client";

import { useEffect, useRef } from "react";

import { api } from "~/trpc/react";

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30_000;

/**
 * Subscribes to /api/sse and invalidates flat list on scrape completion
 * so cards update in real time. Reconnects with backoff on error.
 */
export function useScrapeSse() {
	const utils = api.useUtils();
	const reconnectMsRef = useRef(INITIAL_RECONNECT_MS);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const url = `${window.location.origin}/api/sse`;
		let es: EventSource | null = null;
		let mounted = true;

		const connect = () => {
			if (!mounted) return;
			es = new EventSource(url);

			es.onmessage = (e) => {
				reconnectMsRef.current = INITIAL_RECONNECT_MS;
				try {
					const data = JSON.parse(e.data as string) as {
						type?: string;
						flatId?: number;
						flat?: unknown;
						error?: string;
					};
					if (
						data.type === "flat_scraping_success" ||
						data.type === "flat_scraping_error"
					) {
						void utils.flat.listFlats.invalidate();
					}
				} catch {
					// ignore parse errors (e.g. comment lines)
				}
			};

			es.onerror = () => {
				es?.close();
				es = null;
				if (!mounted) return;
				timeoutRef.current = setTimeout(() => {
					timeoutRef.current = null;
					connect();
				}, reconnectMsRef.current);
				reconnectMsRef.current = Math.min(
					reconnectMsRef.current * 2,
					MAX_RECONNECT_MS,
				);
			};
		};

		connect();

		return () => {
			mounted = false;
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			es?.close();
		};
	}, [utils.flat.listFlats]);
}
