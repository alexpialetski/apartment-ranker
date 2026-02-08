import type { ReloadFlatDeps } from "~/server/flat/use-cases/reload-flat";
import { reloadFlat } from "~/server/flat/use-cases/reload-flat";

export type ReloadAllFlatsDeps = ReloadFlatDeps;

export async function reloadAllFlats(
	deps: ReloadAllFlatsDeps,
): Promise<{ queued: number }> {
	const flats = await deps.flatRepo.listAll();
	for (const flat of flats) {
		await reloadFlat(deps, { id: flat.id });
	}
	return { queued: flats.length };
}
