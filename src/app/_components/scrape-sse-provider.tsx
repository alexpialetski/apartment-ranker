"use client";

import { useScrapeSse } from "~/app/_components/use-scrape-sse";

export function ScrapeSseProvider({ children }: { children: React.ReactNode }) {
	useScrapeSse();
	return <>{children}</>;
}
