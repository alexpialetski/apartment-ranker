import { HydrateClient } from "~/trpc/server";

import { AddAndListScreen } from "./_components/add-and-list-screen";

export default function Home() {
	return (
		<HydrateClient>
			<AddAndListScreen />
		</HydrateClient>
	);
}
