import Link from "next/link";

import { HydrateClient } from "~/trpc/server";

export default function Home() {
	return (
		<HydrateClient>
			<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
				<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
					<h1 className="font-extrabold text-5xl tracking-tight sm:text-[5rem]">
						Apartment Ranker
					</h1>
					<p className="text-white/90 text-xl">
						Smart comparison and ranking of flats (Realt.by) in Minsk.
					</p>
					<p className="text-white/70">
						Add by URL, compare in pairs, get a ranked list within price and
						room-count bands.
					</p>
					<Link
						className="rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20"
						href="#"
					>
						Add &amp; List (coming in Phase 4)
					</Link>
				</div>
			</main>
		</HydrateClient>
	);
}
