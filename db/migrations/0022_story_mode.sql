CREATE TABLE `stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT '新故事' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`world_setting` text DEFAULT '' NOT NULL,
	`background` text DEFAULT '' NOT NULL,
	`image_id` integer,
	`last_modified` integer
);
--> statement-breakpoint
CREATE TABLE `story_characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`story_id` integer NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`brief_description` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `story_chats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`story_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
