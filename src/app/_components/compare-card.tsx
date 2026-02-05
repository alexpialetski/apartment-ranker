"use client";

import type { RouterOutputs } from "~/trpc/react";

type Flat = RouterOutputs["flat"]["listFlats"][number];

/** Read-only flat card for Compare view (no Reload/Remove). */
export function CompareCard({ flat }: { flat: Flat }) {
	return (
		<div className="rounded-lg border border-white/20 bg-white/5 p-4">
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
					{flat.location ? ` · ${flat.location}` : ""}
				</div>
			</div>
			<div className="mt-3">
				<a
					className="rounded bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
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
