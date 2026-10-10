CREATE TABLE `reactions` (
	`code` text NOT NULL,
	`idea` text NOT NULL,
	`participant` text NOT NULL,
	`emoji` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`code`, `idea`, `participant`, `emoji`)
);
--> statement-breakpoint
CREATE INDEX `idx_reactions_code` ON `reactions` (`code`);