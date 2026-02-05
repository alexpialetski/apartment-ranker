ALTER TABLE `apartment-ranker_flat` ADD `ratingDeviation` real DEFAULT 350;--> statement-breakpoint
ALTER TABLE `apartment-ranker_flat` ADD `volatility` real DEFAULT 0.06;--> statement-breakpoint
UPDATE `apartment-ranker_flat` SET `ratingDeviation` = 350, `volatility` = 0.06 WHERE `ratingDeviation` IS NULL OR `volatility` IS NULL;