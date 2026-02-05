"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
	{ href: "/flats", label: "Add & List" },
	{ href: "/compare", label: "Compare" },
	{ href: "/rank", label: "Rank" },
];

export function Nav() {
	const pathname = usePathname();
	return (
		<nav className="border-border border-b bg-surface-elevated">
			<div className="container mx-auto flex gap-4 px-4 py-3">
				{links.map(({ href, label }) => (
					<Link
						className={`rounded px-3 py-1.5 font-medium text-sm transition-colors ${
							pathname === href
								? "bg-accent-muted text-accent"
								: "text-text-muted hover:bg-border/50 hover:text-text"
						}`}
						href={href}
						key={href}
					>
						{label}
					</Link>
				))}
			</div>
		</nav>
	);
}
