import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface RemoveFlatByUrlDeps {
	flatRepo: IFlatRepository;
	normalizeUrl: (url: string) => string;
}

export async function removeFlatByUrl(
	deps: RemoveFlatByUrlDeps,
	input: { realtUrl: string },
): Promise<{ deleted: boolean }> {
	const normalized = deps.normalizeUrl(input.realtUrl);
	const deleted = await deps.flatRepo.deleteByRealtUrl(normalized);
	return { deleted };
}
