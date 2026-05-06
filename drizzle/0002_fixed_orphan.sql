-- Add the multiplier + base_score columns to the score table.
-- Defaults (0 for base_score, 1.0 for multiplier) backfill cleanly:
-- legacy rows had no concept of multiplier (= 1.0 = today's Normal preset),
-- and base_score == score when multiplier is 1.0 (we set base_score = score
-- below so legacy rows are queryable consistently with new rows).
ALTER TABLE `score` ADD COLUMN `base_score` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `score` ADD COLUMN `multiplier` real NOT NULL DEFAULT 1.0;--> statement-breakpoint

-- Remap historical mode='standard' to the new canonical 'normal' preset name.
-- The old 'standard' was equivalent to today's Normal (no whitespace toggles,
-- ×1.0 multiplier), so the rename is lossless.
UPDATE `score` SET `mode` = 'normal' WHERE `mode` = 'standard';--> statement-breakpoint
UPDATE `best_score` SET `mode` = 'normal' WHERE `mode` = 'standard';--> statement-breakpoint

-- Backfill base_score = score for legacy rows where the new column is still 0.
-- Going forward submitAuthenticatedScore writes both columns explicitly.
UPDATE `score` SET `base_score` = `score` WHERE `base_score` = 0;
