ALTER TABLE `participants` ADD `username` text;--> statement-breakpoint
ALTER TABLE `participants` ADD `pinHash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_participants_username` ON `participants` (`code`,`username`);