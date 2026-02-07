"use client";

import {
	Document,
	Font,
	Link,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import type { RouterOutputs } from "~/trpc/react";

type RankedFlats = RouterOutputs["rank"]["getRankedFlats"];

// Helvetica has no Cyrillic; location (e.g. Minsk addresses) would render as garbage.
Font.register({
	family: "Roboto",
	src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
});

const styles = StyleSheet.create({
	page: {
		padding: 40,
		fontFamily: "Roboto",
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 24,
	},
	bandTitle: {
		fontSize: 16,
		fontWeight: "bold",
		marginBottom: 12,
		marginTop: 16,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		gap: 8,
	},
	index: {
		width: 24,
		fontSize: 10,
		color: "#57534e",
		textAlign: "right",
	},
	details: {
		flex: 1,
		fontSize: 10,
		color: "#1c1917",
	},
	link: {
		fontSize: 10,
		color: "#0f766e",
		textDecoration: "none",
	},
});

function formatFlatLine(flat: RankedFlats[number]["flats"][number]): string {
	const parts: string[] = [];
	if (flat.price != null) parts.push(`$${flat.price.toLocaleString()}`);
	if (flat.pricePerSqm != null) parts.push(`$${flat.pricePerSqm}/m²`);
	if (flat.rooms != null) parts.push(`${flat.rooms} room(s)`);
	if (flat.area != null) parts.push(`${flat.area} m²`);
	if (flat.location) parts.push(flat.location);
	return parts.join(" · ") || "—";
}

export function RankPdfDocument({ ranked }: { ranked: RankedFlats }) {
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<Text style={styles.title}>Rank</Text>
				{ranked.map(({ band, flats }) => (
					<View key={band}>
						<Text style={styles.bandTitle}>{band}</Text>
						{flats.map((flat, index) => (
							<Link key={flat.id} src={flat.realtUrl} style={styles.row}>
								<Text style={styles.index}>{index + 1}</Text>
								<Text style={styles.details}>{formatFlatLine(flat)}</Text>
								<Text style={styles.link}>Open on Realt</Text>
							</Link>
						))}
					</View>
				))}
			</Page>
		</Document>
	);
}
