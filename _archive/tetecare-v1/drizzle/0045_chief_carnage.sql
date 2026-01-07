ALTER TABLE `wall_posts` ADD `targetType` enum('general','tutor','pet') DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `wall_posts` ADD `targetId` int;