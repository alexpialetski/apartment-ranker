import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface GetFlatDeps {
	flatRepo: IFlatRepository;
}

export async function getFlat(
	deps: GetFlatDeps,
	input: { id: number },
): Promise<Flat | null> {
	return deps.flatRepo.findById(input.id);
}
