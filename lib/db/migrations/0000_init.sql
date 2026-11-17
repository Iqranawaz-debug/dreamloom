CREATE TABLE `dream_symbols` (
	`dream_id` integer NOT NULL,
	`symbol_id` integer NOT NULL,
	PRIMARY KEY(`dream_id`, `symbol_id`),
	FOREIGN KEY (`dream_id`) REFERENCES `dreams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`symbol_id`) REFERENCES `symbols`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dream_symbols_symbol_idx` ON `dream_symbols` (`symbol_id`);--> statement-breakpoint
CREATE TABLE `dreams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`raw_text` text NOT NULL,
	`cleaned_text` text,
	`title` text,
	`mood` text,
	`image_url` text,
	`image_prompt` text,
	`poem` text,
	`style` text,
	`poem_style` text,
	`is_sample` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `dreams_created_at_idx` ON `dreams` (`created_at`);--> statement-breakpoint
CREATE TABLE `followups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dream_id` integer NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	FOREIGN KEY (`dream_id`) REFERENCES `dreams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `symbols` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `symbols_name_unique` ON `symbols` (`name`);