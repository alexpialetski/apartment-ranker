"use client";

import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";

type Flat = RouterOutputs["flat"]["listFlats"][number];

/** Read-only flat card for Compare view (no Reload/Remove). */
export function CompareCard({ flat }: { flat: Flat }) {
	return (
		<div className="rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
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
				</div>
			</div>
			<div className="mt-3">
				<a
					className="rounded bg-accent-muted px-3 py-1.5 text-accent text-sm hover:bg-accent-muted/80"
					href={flat.realtUrl}
					rel="noopener noreferrer"
					target="_blank"
				>
					Open on Realt
				</a>
			</div>
		</div>
	);
}
