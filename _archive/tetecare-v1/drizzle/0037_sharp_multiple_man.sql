CREATE TABLE `event_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20) NOT NULL,
	`icon` varchar(50),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `eventType` enum('holiday','medical','general','vaccination','medication','closure','checkin','checkout','preventive','custom') NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `customEventTypeId` int;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `customColor` varchar(20);