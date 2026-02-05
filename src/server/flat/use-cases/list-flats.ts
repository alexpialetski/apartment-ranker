import type { Flat } from "~/server/flat/domain/flat";
import type { IFlatRepository } from "~/server/flat/port/flat.repository";

export interface ListFlatsDeps {
	flatRepo: IFlatRepository;
}

export async function listFlats(deps: ListFlatsDeps): Promise<Flat[]> {
	return deps.flatRepo.listAll();
}
