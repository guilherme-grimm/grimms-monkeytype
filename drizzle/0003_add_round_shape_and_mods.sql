DROP INDEX `best_score_user_language_mode_unique`;--> statement-breakpoint
ALTER TABLE `best_score` ADD `round_shape` text DEFAULT 'timed' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `best_score_user_language_mode_round_shape_unique` ON `best_score` (`user_id`,`language`,`mode`,`round_shape`);--> statement-breakpoint
ALTER TABLE `score` ADD `mods` text;--> statement-breakpoint
ALTER TABLE `score` ADD `round_shape` text DEFAULT 'timed' NOT NULL;--> statement-breakpoint
ALTER TABLE `score` ADD `survival_bonus` real DEFAULT 0 NOT NULL;