CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`nickname` text NOT NULL,
	`type` text NOT NULL,
	`parent` text,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`shortlisted` integer DEFAULT 0 NOT NULL,
	`highlighted` integer DEFAULT 0 NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ideas_code` ON `ideas` (`code`);--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`nickname` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `sessions`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_participants_code` ON `participants` (`code`);--> statement-breakpoint
CREATE TABLE `reflections` (
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`skill` text NOT NULL,
	PRIMARY KEY(`code`, `participant`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`code` text PRIMARY KEY NOT NULL,
	`adminHash` text NOT NULL,
	`config` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`idea` text NOT NULL,
	PRIMARY KEY(`code`, `participant`, `idea`)
);
--> statement-breakpoint
CREATE INDEX `idx_votes_code_idea` ON `votes` (`code`,`idea`);