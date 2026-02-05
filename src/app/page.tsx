import { redirect } from "next/navigation";

type HomePageProps = Readonly<{
	params?: Promise<Record<string, string | string[]>>;
	searchParams?: Promise<Record<string, string | string[]>>;
}>;

export default async function Home({ params, searchParams }: HomePageProps) {
	if (params) await params;
	if (searchParams) await searchParams;
	redirect("/flats");
}
