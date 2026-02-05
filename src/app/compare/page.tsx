"use client";

import { use, useCallback, useState } from "react";

import { CompareCard } from "~/app/_components/compare-card";
import { api } from "~/trpc/react";

type ComparePageProps = Readonly<{
	params?: Promise<Record<string, string | string[]>>;
	searchParams?: Promise<Record<string, string | string[]>>;
}>;

const empty = Promise.resolve({} as Record<string, string | string[]>);

export default function ComparePage({
	params,
	searchParams,
}: ComparePageProps) {
	use(params ?? empty);
	use(searchParams ?? empty);
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
	const hasPair = pair?.left && pair.right;

	const handleChoice = useCallback(
		(winnerId: number, loserId: number) => {
			submitComparison.mutate({ winnerId, loserId });
		},
		[submitComparison],
	);

	return (
		<main className="min-h-screen bg-surface text-text">
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<h1 className="mb-8 font-extrabold text-3xl text-text tracking-tight sm:text-4xl">
					Compare
				</h1>

				<section className="mb-8">
					<label className="mb-2 block text-sm text-text-muted" htmlFor="band">
						Band
					</label>
					<select
						className="rounded border border-border bg-surface-elevated px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-accent"
						id="band"
						onChange={(e) => setBand(e.target.value)}
						value={band}
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
							className="size-8 animate-spin rounded-full border-2 border-accent border-transparent"
						/>
						<span className="text-text-muted">Loading pair…</span>
					</div>
				)}

				{band && !isLoading && !hasPair && (
					<p className="text-text-muted">
						Need at least 2 successfully scraped flats in this band. Add flats
						and ensure they’re in the same room/price band.
					</p>
				)}

				{band && !isLoading && hasPair && (
					<section className="flex flex-col gap-6 sm:flex-row sm:gap-8">
						<div className="flex flex-1 flex-col gap-4">
							<div className="text-sm text-text-subtle">Left</div>
							<CompareCard flat={pair.left} />
							<button
								aria-label="Left is better"
								className="rounded bg-accent px-4 py-2 font-medium text-surface-elevated hover:bg-accent-hover disabled:opacity-50"
								disabled={submitComparison.isPending}
								onClick={() => handleChoice(pair.left.id, pair.right.id)}
								type="button"
							>
								{submitComparison.isPending ? "Submitting…" : "Left is better"}
							</button>
						</div>
						<div className="flex flex-1 flex-col gap-4">
							<div className="text-sm text-text-subtle">Right</div>
							<CompareCard flat={pair.right} />
							<button
								aria-label="Right is better"
								className="rounded bg-accent px-4 py-2 font-medium text-surface-elevated hover:bg-accent-hover disabled:opacity-50"
								disabled={submitComparison.isPending}
								onClick={() => handleChoice(pair.right.id, pair.left.id)}
								type="button"
							>
								{submitComparison.isPending ? "Submitting…" : "Right is better"}
							</button>
						</div>
						<div className="flex flex-col justify-end">
							<button
								aria-label="Skip this pair and show another"
								className="rounded border border-border px-4 py-2 text-sm text-text-muted hover:bg-border/50 hover:text-text"
								onClick={() => void pairQuery.refetch()}
								type="button"
							>
								Skip / Can’t decide
							</button>
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
