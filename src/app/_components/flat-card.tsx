"use client";

import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

type Flat = RouterOutputs["flat"]["listFlats"][number];

export function FlatCard({
	flat,
	showRemoveButton = false,
}: {
	flat: Flat;
	showRemoveButton?: boolean;
}) {
	const utils = api.useUtils();
	const reloadFlat = api.flat.reloadFlat.useMutation({
		onMutate: async ({ id }) => {
			// Optimistically show "Scraping…" immediately (worker is async, refetch may return after it finishes)
			await utils.flat.listFlats.cancel();
			await utils.rank.getRankedFlats.cancel();
			utils.flat.listFlats.setData(undefined, (prev) => {
				if (!prev) return prev;
				return prev.map((f) =>
					f.id === id ? { ...f, scrapeStatus: "scraping" as const } : f,
				);
			});
			utils.rank.getRankedFlats.setData(undefined, (prev) => {
				if (!prev) return prev;
				return prev.map(({ band, flats }) => ({
					band,
					flats: flats.map((f) =>
						f.id === id ? { ...f, scrapeStatus: "scraping" as const } : f,
					),
				}));
			});
		},
		onSuccess: () => {
			void utils.flat.listFlats.invalidate();
		},
	});

	const removeFlat = api.flat.removeByUrl.useMutation({
		onSuccess: () => {
			void utils.flat.listFlats.invalidate();
			void utils.rank.getRankedFlats.invalidate();
		},
	});

	const isScraping =
		flat.scrapeStatus === "scraping" || flat.scrapeStatus === "pending";
	const isError = flat.scrapeStatus === "error";
	const isSuccess = flat.scrapeStatus === "success";

	return (
		<div
			aria-busy={isScraping}
			aria-live="polite"
			className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm"
		>
			{isScraping && (
				<div className="flex items-center gap-3">
					<div
						aria-hidden
						className="size-6 animate-spin rounded-full border-2 border-accent border-transparent"
					/>
					<span className="text-text-muted">Scraping…</span>
				</div>
			)}

			{isSuccess && (
				<>
					{flat.imageUrl && (
						<div className="relative mb-3 size-24 overflow-hidden rounded-md border border-border bg-surface sm:size-32">
							<Image
								alt=""
								className="object-cover"
								fill
								sizes="128px"
								src={flat.imageUrl}
								unoptimized
							/>
						</div>
					)}
					<div className="flex flex-col gap-1">
						<div className="flex items-baseline gap-2">
							<span className="font-semibold text-text">
								${flat.price?.toLocaleString() ?? "—"}
							</span>
							{flat.pricePerSqm != null && (
								<span className="text-sm text-text-muted">
									${flat.pricePerSqm}/m²
								</span>
							)}
						</div>
						<div className="text-sm text-text-muted">
							{flat.rooms != null ? `${flat.rooms} room(s)` : ""}
							{flat.area != null ? ` · ${flat.area} m²` : ""}
							{flat.location ? ` · ${flat.location}` : ""}
							{flat.listedAt != null
								? ` · Listed ${new Date(flat.listedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
								: ""}
						</div>
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						<a
							aria-label="Open listing on Realt"
							className="rounded bg-accent-muted px-3 py-1.5 text-accent text-sm hover:bg-accent-muted/80"
							href={flat.realtUrl}
							rel="noopener noreferrer"
							target="_blank"
						>
							Open on Realt
						</a>
						<button
							aria-label={
								reloadFlat.isPending
									? "Reloading flat data"
									: "Reload flat data"
							}
							className="rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-border/50 disabled:opacity-50"
							disabled={reloadFlat.isPending}
							onClick={() => reloadFlat.mutate({ id: flat.id })}
							type="button"
						>
							{reloadFlat.isPending ? "Reloading…" : "Reload"}
						</button>
						{showRemoveButton && (
							<button
								aria-label="Remove flat"
								className="rounded border border-red-500/50 px-3 py-1.5 text-red-500 text-sm hover:bg-red-500/10 disabled:opacity-50"
								disabled={removeFlat.isPending}
								onClick={() => removeFlat.mutate({ realtUrl: flat.realtUrl })}
								type="button"
							>
								{removeFlat.isPending ? "Removing…" : "Remove"}
							</button>
						)}
					</div>
				</>
			)}

			{isError && (
				<div className="flex flex-col gap-2">
					<p className="text-text">Couldn’t load</p>
					<button
						aria-label={
							reloadFlat.isPending ? "Reloading flat data" : "Reload flat data"
						}
						className="w-fit rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-border/50 disabled:opacity-50"
						disabled={reloadFlat.isPending}
						onClick={() => reloadFlat.mutate({ id: flat.id })}
						type="button"
					>
						{reloadFlat.isPending ? "Reloading…" : "Reload"}
					</button>
				</div>
			)}
		</div>
	);
}
