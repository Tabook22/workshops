CREATE TABLE `board_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`nickname` text NOT NULL,
	`room` text,
	`team` text NOT NULL,
	`kind` text NOT NULL,
	`parent` text,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`resolved` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_board_code_created` ON `board_posts` (`code`,`created`);--> statement-breakpoint
CREATE INDEX `idx_board_parent` ON `board_posts` (`parent`);