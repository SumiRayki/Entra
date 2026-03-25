CREATE TABLE `adventure_characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`adventure_id` integer NOT NULL,
	`character_id` integer,
	`role` text DEFAULT 'npc' NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`brief_description` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`adventure_id`) REFERENCES `adventures`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `adventure_chats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`adventure_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`active_protagonist_id` integer,
	FOREIGN KEY (`adventure_id`) REFERENCES `adventures`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`active_protagonist_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `adventures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text DEFAULT '新冒险' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`scenario` text DEFAULT '' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`image_id` integer,
	`last_modified` integer
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `gender` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `age` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `height` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `weight` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `background_story` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `personality_traits` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `relationships` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `nsfw_cup_size` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `nsfw_hip` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `nsfw_sensitive_areas` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `nsfw_orientation` text DEFAULT '' NOT NULL;