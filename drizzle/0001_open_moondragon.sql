CREATE TABLE `best_score` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`mode` text DEFAULT 'standard' NOT NULL,
	`score_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`score_id`) REFERENCES `score`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `best_score_user_language_mode_unique` ON `best_score` (`user_id`,`language`,`mode`);--> statement-breakpoint
CREATE TABLE `score` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`mode` text DEFAULT 'standard' NOT NULL,
	`score` integer NOT NULL,
	`wpm` real NOT NULL,
	`cpm` integer NOT NULL,
	`accuracy` real NOT NULL,
	`correct_chars` integer NOT NULL,
	`incorrect_chars` integer NOT NULL,
	`total_typed_chars` integer NOT NULL,
	`snippets_completed` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
