ALTER TABLE `calendar_events` MODIFY COLUMN `eventType` enum('holiday','medical','general','vaccination','medication','closure') NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `location` varchar(200);--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `reminderSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `createdById` int NOT NULL;