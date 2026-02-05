CREATE TABLE `apartment-ranker_comparison` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`winnerId` integer NOT NULL,
	`loserId` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`winnerId`) REFERENCES `apartment-ranker_flat`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`loserId`) REFERENCES `apartment-ranker_flat`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `apartment-ranker_flat` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`realtUrl` text(2048) NOT NULL,
	`price` real,
	`pricePerSqm` real,
	`rooms` integer,
	`location` text,
	`area` real,
	`imageUrl` text,
	`scrapeStatus` text(32) DEFAULT 'pending' NOT NULL,
	`eloRating` real DEFAULT 1500 NOT NULL,
	`band` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apartment-ranker_flat_realtUrl_unique` ON `apartment-ranker_flat` (`realtUrl`);--> statement-breakpoint
CREATE INDEX `flat_scrape_status_idx` ON `apartment-ranker_flat` (`scrapeStatus`);--> statement-breakpoint
CREATE INDEX `flat_band_idx` ON `apartment-ranker_flat` (`band`);--> statement-breakpoint
CREATE INDEX `flat_band_elo_idx` ON `apartment-ranker_flat` (`band`,`eloRating`);