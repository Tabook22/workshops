CREATE TABLE `upload_chunks` (
	`id` text NOT NULL,
	`idx` integer NOT NULL,
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`data` blob NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`id`, `idx`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`participant` text NOT NULL,
	`nickname` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`data` blob NOT NULL,
	`status` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_uploads_code` ON `uploads` (`code`);