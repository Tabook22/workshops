CREATE TABLE `translations` (
	`key` text PRIMARY KEY NOT NULL,
	`target` text NOT NULL,
	`text` text NOT NULL,
	`provider` text NOT NULL,
	`created` integer NOT NULL
);
