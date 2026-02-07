"use client";

import { pdf } from "@react-pdf/renderer";
import { use, useState } from "react";

import { FlatCard } from "~/app/_components/flat-card";
import { RankPdfDocument } from "~/app/_components/rank-pdf-document";
import { api } from "~/trpc/react";

type RankPageProps = Readonly<{
	params?: Promise<Record<string, string | string[]>>;
	searchParams?: Promise<Record<string, string | string[]>>;
}>;

const empty = Promise.resolve({} as Record<string, string | string[]>);

export default function RankPage({ params, searchParams }: RankPageProps) {
	use(params ?? empty);
	use(searchParams ?? empty);
	const [isExporting, setIsExporting] = useState(false);
	const rankedQuery = api.rank.getRankedFlats.useQuery();
	const ranked = rankedQuery.data ?? [];

	async function handleExportPdf() {
		if (ranked.length === 0) return;
		setIsExporting(true);
		try {
			const blob = await pdf(<RankPdfDocument ranked={ranked} />).toBlob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			const date = new Date().toISOString().slice(0, 10);
			a.download = `rank-${date}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<main className="min-h-screen bg-surface text-text">
			<div className="container mx-auto max-w-3xl px-4 py-8">
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<h1 className="font-extrabold text-3xl text-text tracking-tight sm:text-4xl">
						Rank
					</h1>
					{rankedQuery.isSuccess && ranked.length > 0 && (
						<button
							aria-label={isExporting ? "Exporting PDF…" : "Export to PDF"}
							className="rounded bg-accent-muted px-4 py-2 font-medium text-accent text-sm hover:bg-accent-muted/80 disabled:opacity-50"
							disabled={isExporting}
							onClick={() => void handleExportPdf()}
							type="button"
						>
							{isExporting ? "Exporting…" : "Export to PDF"}
						</button>
					)}
				</div>

				{rankedQuery.isLoading && <p className="text-text-muted">Loading…</p>}

				{rankedQuery.isSuccess && ranked.length === 0 && (
					<p className="text-text-muted">
						No ranked flats yet. Add flats, then use Compare to record choices.
					</p>
				)}

				{rankedQuery.isSuccess && ranked.length > 0 && (
					<div className="flex flex-col gap-8">
						{ranked.map(({ band, flats }) => (
							<section key={band}>
								<h2 className="mb-4 font-semibold text-text text-xl">{band}</h2>
								<ul className="flex flex-col gap-3">
									{flats.map((flat, index) => (
										<li className="flex items-center gap-3" key={flat.id}>
											<span className="w-6 text-right text-sm text-text-subtle">
												{index + 1}
											</span>
											<div className="flex-1">
												<FlatCard flat={flat} showRemoveButton />
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
