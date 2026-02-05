"use client";

import { FlatCard } from "~/app/_components/flat-card";
import { api } from "~/trpc/react";

export default function RankPage() {
	const rankedQuery = api.rank.getRankedFlats.useQuery();
	const ranked = rankedQuery.data ?? [];

	return (
		<main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container mx-auto max-w-3xl px-4 py-8">
				<h1 className="mb-8 font-extrabold text-3xl tracking-tight sm:text-4xl">
					Rank
				</h1>

				{rankedQuery.isLoading && <p className="text-white/70">Loading…</p>}

				{rankedQuery.isSuccess && ranked.length === 0 && (
					<p className="text-white/70">
						No ranked flats yet. Add flats, then use Compare to record choices.
					</p>
				)}

				{rankedQuery.isSuccess && ranked.length > 0 && (
					<div className="flex flex-col gap-8">
						{ranked.map(({ band, flats }) => (
							<section key={band}>
								<h2 className="mb-4 font-semibold text-white/90 text-xl">
									{band}
								</h2>
								<ul className="flex flex-col gap-3">
									{flats.map((flat, index) => (
										<li className="flex items-center gap-3" key={flat.id}>
											<span className="w-6 text-right text-sm text-white/60">
												{index + 1}
											</span>
											<div className="flex-1">
												<FlatCard flat={flat} />
											</div>
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
