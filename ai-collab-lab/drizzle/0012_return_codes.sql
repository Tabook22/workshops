CREATE TABLE `access_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `participants` ADD `returnHash` text;--> statement-breakpoint
CREATE INDEX `idx_participants_return` ON `participants` (`returnHash`);