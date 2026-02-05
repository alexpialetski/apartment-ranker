"use client";

import { useCallback, useState } from "react";

import { CompareCard } from "~/app/_components/compare-card";
import { api } from "~/trpc/react";

export default function ComparePage() {
	const [band, setBand] = useState<string>("");

	const bandsQuery = api.comparison.getBands.useQuery();
	const pairQuery = api.comparison.getComparisonPair.useQuery(
		{ band },
		{ enabled: !!band },
	);
	const submitComparison = api.comparison.submitComparison.useMutation({
		onSuccess: () => {
			void pairQuery.refetch();
		},
	});

	const pair = pairQuery.data;
	const bands = bandsQuery.data ?? [];
	const isLoading = pairQuery.isLoading || pairQuery.isFetching;
	const hasPair = pair && pair.left && pair.right;

	const handleChoice = useCallback(
		(winnerId: number, loserId: number) => {
			submitComparison.mutate({ winnerId, loserId });
		},
		[submitComparison],
	);

	return (
		<main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<h1 className="mb-8 font-extrabold text-3xl tracking-tight sm:text-4xl">
					Compare
				</h1>

				<section className="mb-8">
					<label className="mb-2 block text-sm text-white/80" htmlFor="band">
						Band
					</label>
					<select
						className="rounded border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
						id="band"
						value={band}
						onChange={(e) => setBand(e.target.value)}
					>
						<option value="">Select a band</option>
						{bands.map((b) => (
							<option key={b} value={b}>
								{b}
							</option>
						))}
					</select>
				</section>

				{!band && (
					<p className="text-white/70">
						Select a band to see two flats to compare.
					</p>
				)}

				{band && isLoading && (
					<div className="flex items-center gap-3 py-8">
						<div
							aria-hidden
							className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white"
						/>
						<span className="text-white/80">Loading pair…</span>
					</div>
				)}

				{band && !isLoading && !hasPair && (
					<p className="text-white/70">
						Need at least 2 successfully scraped flats in this band. Add flats
						and ensure they’re in the same room/price band.
					</p>
				)}

				{band && !isLoading && hasPair && (
					<section className="flex flex-col gap-6 sm:flex-row sm:gap-8">
						<div className="flex flex-1 flex-col gap-4">
							<div className="text-sm text-white/70">Left</div>
							<CompareCard flat={pair.left} />
							<button
								className="rounded bg-white/20 px-4 py-2 font-medium hover:bg-white/30 disabled:opacity-50"
								disabled={submitComparison.isPending}
								onClick={() =>
									handleChoice(pair.left.id, pair.right.id)
								}
								type="button"
							>
								{submitComparison.isPending ? "Submitting…" : "Left is better"}
							</button>
						</div>
						<div className="flex flex-1 flex-col gap-4">
							<div className="text-sm text-white/70">Right</div>
							<CompareCard flat={pair.right} />
							<button
								className="rounded bg-white/20 px-4 py-2 font-medium hover:bg-white/30 disabled:opacity-50"
								disabled={submitComparison.isPending}
								onClick={() =>
									handleChoice(pair.right.id, pair.left.id)
								}
								type="button"
							>
								{submitComparison.isPending ? "Submitting…" : "Right is better"}
							</button>
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
