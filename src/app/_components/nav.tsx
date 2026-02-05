"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
	{ href: "/", label: "Add & List" },
	{ href: "/compare", label: "Compare" },
	{ href: "/rank", label: "Rank" },
];

export function Nav() {
	const pathname = usePathname();
	return (
		<nav className="border-b border-white/20 bg-black/20">
			<div className="container mx-auto flex gap-4 px-4 py-3">
				{links.map(({ href, label }) => (
					<Link
						key={href}
						className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
							pathname === href
								? "bg-white/20 text-white"
								: "text-white/80 hover:bg-white/10 hover:text-white"
						}`}
						href={href}
					>
						{label}
					</Link>
				))}
			</div>
		</nav>
	);
}
