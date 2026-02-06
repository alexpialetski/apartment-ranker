"use client";

import { use, useState } from "react";

import { FlatCard } from "~/app/_components/flat-card";
import { api } from "~/trpc/react";

type FlatsPageProps = Readonly<{
	params?: Promise<Record<string, string | string[]>>;
	searchParams?: Promise<Record<string, string | string[]>>;
}>;

const empty = Promise.resolve({} as Record<string, string | string[]>);

export default function FlatsPage({ params, searchParams }: FlatsPageProps) {
	use(params ?? empty);
	use(searchParams ?? empty);
	const [addUrl, setAddUrl] = useState("");
	const [removeUrl, setRemoveUrl] = useState("");

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
		<main className="min-h-screen bg-surface text-text">
			<div className="container mx-auto max-w-3xl px-4 py-8">
				<h1 className="mb-8 font-extrabold text-3xl text-text tracking-tight sm:text-4xl">
					Add &amp; List
				</h1>

				{/* Top section: Add by URL, Remove by URL */}
				<section className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
					<div className="flex flex-1 flex-col gap-1">
						<label className="text-sm text-text-muted" htmlFor="add-url">
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
								className="flex-1 rounded border border-border bg-surface-elevated px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent"
								disabled={addByUrl.isPending}
								id="add-url"
								onChange={(e) => setAddUrl(e.target.value)}
								placeholder="https://realt.by/..."
								type="url"
								value={addUrl}
							/>
							<button
								className="rounded bg-accent px-4 py-2 font-medium text-surface-elevated hover:bg-accent-hover disabled:opacity-50"
								disabled={addByUrl.isPending || !addUrl.trim()}
								type="submit"
							>
								{addByUrl.isPending ? "Adding…" : "Add"}
							</button>
						</form>
						{addByUrl.isError && (
							<p className="text-error text-sm">{addByUrl.error.message}</p>
						)}
					</div>

					<div className="flex flex-1 flex-col gap-1">
						<label className="text-sm text-text-muted" htmlFor="remove-url">
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
								className="flex-1 rounded border border-border bg-surface-elevated px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent"
								disabled={removeByUrl.isPending}
								id="remove-url"
								onChange={(e) => setRemoveUrl(e.target.value)}
								placeholder="https://realt.by/..."
								type="text"
								value={removeUrl}
							/>
							<button
								className="rounded bg-accent px-4 py-2 font-medium text-surface-elevated hover:bg-accent-hover disabled:opacity-50"
								disabled={removeByUrl.isPending || !removeUrl.trim()}
								type="submit"
							>
								{removeByUrl.isPending ? "Removing…" : "Remove"}
							</button>
						</form>
						{removeByUrl.isSuccess && !removeByUrl.data?.deleted && (
							<p className="text-sm text-text-subtle">
								No flat found with that URL
							</p>
						)}
					</div>
				</section>

				{/* List */}
				<section>
					<h2 className="mb-4 font-semibold text-text text-xl">Flats</h2>
					{listFlats.isLoading && <p className="text-text-muted">Loading…</p>}
					{listFlats.isSuccess && flats.length === 0 && (
						<p className="text-text-muted">
							No flats yet. Add one with a Realt.by URL above.
						</p>
					)}
					{listFlats.isSuccess && flats.length > 0 && (
						<ul className="flex flex-col gap-3">
							{flats.map((flat) => (
								<li key={flat.id}>
									<FlatCard flat={flat} showRemoveButton />
								</li>
							))}
						</ul>
					)}
				</section>
			</div>
		</main>
	);
}
