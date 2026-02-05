"use client";

import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";

type Flat = RouterOutputs["flat"]["listFlats"][number];

export function FlatCard({ flat }: { flat: Flat }) {
	const utils = api.useUtils();
	const reloadFlat = api.flat.reloadFlat.useMutation({
		onSuccess: () => {
			void utils.flat.listFlats.invalidate();
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
			className="rounded-lg border border-white/20 bg-white/5 p-4"
		>
			{isScraping && (
				<div className="flex items-center gap-3">
					<div
						aria-hidden
						className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white"
					/>
					<span className="text-white/80">Scraping…</span>
				</div>
			)}

			{isSuccess && (
				<>
					{flat.imageUrl && (
						<div className="relative mb-3 size-24 overflow-hidden rounded-md bg-white/5 sm:size-32">
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
							<span className="font-semibold text-white">
								${flat.price?.toLocaleString() ?? "—"}
							</span>
							{flat.pricePerSqm != null && (
								<span className="text-sm text-white/70">
									${flat.pricePerSqm}/m²
								</span>
							)}
						</div>
						<div className="text-sm text-white/80">
							{flat.rooms != null ? `${flat.rooms} room(s)` : ""}
							{flat.area != null ? ` · ${flat.area} m²` : ""}
							{flat.location ? ` · ${flat.location}` : ""}
						</div>
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						<a
							aria-label="Open listing on Realt"
							className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
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
							className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
							disabled={reloadFlat.isPending}
							onClick={() => reloadFlat.mutate({ id: flat.id })}
							type="button"
						>
							{reloadFlat.isPending ? "Reloading…" : "Reload"}
						</button>
					</div>
				</>
			)}

			{isError && (
				<div className="flex flex-col gap-2">
					<p className="text-white/90">Couldn’t load</p>
					<button
						aria-label={
							reloadFlat.isPending ? "Reloading flat data" : "Reload flat data"
						}
						className="w-fit rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
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
