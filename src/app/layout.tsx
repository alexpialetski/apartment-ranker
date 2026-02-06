import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Nav } from "~/app/_components/nav";
import { ScrapeSseProvider } from "~/app/_components/scrape-sse-provider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Apartment Ranker",
	description: "Smart comparison and ranking of flats (Realt.by) in Minsk",
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

type RootLayoutProps = Readonly<{
	children: React.ReactNode;
	params?: Promise<Record<string, string | string[]>>;
}>;

export default async function RootLayout({
	children,
	params,
}: RootLayoutProps) {
	if (params) await params;
	return (
		<html className={`${geist.variable}`} lang="en">
			<body>
				<TRPCReactProvider>
					<ScrapeSseProvider>
						<Nav />
						{children}
					</ScrapeSseProvider>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
