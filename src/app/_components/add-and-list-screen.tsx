"use client";

import { useState } from "react";

import { FlatCard } from "~/app/_components/flat-card";
import { useScrapeSse } from "~/app/_components/use-scrape-sse";
import { api } from "~/trpc/react";

export function AddAndListScreen() {
	const [addUrl, setAddUrl] = useState("");
	const [removeUrl, setRemoveUrl] = useState("");

	useScrapeSse();

	const utils = api.useUtils();

	const listFlats = api.flat.listFlats.useQuery();
	const addByUrl = api.flat.addByUrl.useMutation({
		onSuccess: () => {
			setAddUrl("");
			void utils.flat.listFlats.invalidate();
		},
	});
	const removeByUrl = api.flat.removeByUrl.useMutation({
		onSuccess: () => {
			setRemoveUrl("");
			void utils.flat.listFlats.invalidate();
		},
	});

	const flats = listFlats.data ?? [];

	return (
		<main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container mx-auto max-w-3xl px-4 py-8">
				<h1 className="mb-8 font-extrabold text-3xl tracking-tight sm:text-4xl">
					Add &amp; List
				</h1>

				{/* Top section: Add by URL, Remove by URL */}
				<section className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
					<div className="flex flex-1 flex-col gap-1">
						<label className="text-sm text-white/80" htmlFor="add-url">
							Add by URL
						</label>
						<form
							className="flex gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const url = addUrl.trim();
								if (url) addByUrl.mutate({ realtUrl: url });
							}}
						>
							<input
								className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
								disabled={addByUrl.isPending}
								id="add-url"
								onChange={(e) => setAddUrl(e.target.value)}
								placeholder="https://realt.by/..."
								type="url"
								value={addUrl}
							/>
							<button
								className="rounded bg-white/20 px-4 py-2 font-medium hover:bg-white/30 disabled:opacity-50"
								disabled={addByUrl.isPending || !addUrl.trim()}
								type="submit"
							>
								{addByUrl.isPending ? "Adding…" : "Add"}
							</button>
						</form>
						{addByUrl.isError && (
							<p className="text-red-300 text-sm">{addByUrl.error.message}</p>
						)}
					</div>

					<div className="flex flex-1 flex-col gap-1">
						<label className="text-sm text-white/80" htmlFor="remove-url">
							Remove by URL
						</label>
						<form
							className="flex gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const url = removeUrl.trim();
								if (url) removeByUrl.mutate({ realtUrl: url });
							}}
						>
							<input
								className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
								disabled={removeByUrl.isPending}
								id="remove-url"
								onChange={(e) => setRemoveUrl(e.target.value)}
								placeholder="https://realt.by/..."
								type="text"
								value={removeUrl}
							/>
							<button
								className="rounded bg-white/20 px-4 py-2 font-medium hover:bg-white/30 disabled:opacity-50"
								disabled={removeByUrl.isPending || !removeUrl.trim()}
								type="submit"
							>
								{removeByUrl.isPending ? "Removing…" : "Remove"}
							</button>
						</form>
						{removeByUrl.isSuccess && !removeByUrl.data?.deleted && (
							<p className="text-sm text-white/70">
								No flat found with that URL
							</p>
						)}
					</div>
				</section>

				{/* List */}
				<section>
					<h2 className="mb-4 font-semibold text-xl">Flats</h2>
					{listFlats.isLoading && <p className="text-white/70">Loading…</p>}
					{listFlats.isSuccess && flats.length === 0 && (
						<p className="text-white/70">
							No flats yet. Add one with a Realt.by URL above.
						</p>
					)}
					{listFlats.isSuccess && flats.length > 0 && (
						<ul className="flex flex-col gap-3">
							{flats.map((flat) => (
								<li key={flat.id}>
									<FlatCard flat={flat} />
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</main>
	);
}
