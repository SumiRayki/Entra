ALTER TABLE `characters` ADD `nsfw` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `nsfw_description` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` ADD `jailbreak_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` ADD `jailbreak_prompt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `instructs` ADD `jailbreak_position` text DEFAULT 'after_system' NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebook_entries` ADD `nsfw` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `lorebooks` ADD `nsfw` integer DEFAULT false NOT NULL;