ALTER TABLE `participants` ADD `member` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `role` text DEFAULT 'member' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_participants_member` ON `participants` (`member`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `parent` text;--> statement-breakpoint
CREATE INDEX `idx_sessions_parent` ON `sessions` (`parent`);