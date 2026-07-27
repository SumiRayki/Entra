ALTER TABLE `chats` ADD `context_summary` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `chats` ADD `context_summary_end_order` integer DEFAULT -1 NOT NULL;
