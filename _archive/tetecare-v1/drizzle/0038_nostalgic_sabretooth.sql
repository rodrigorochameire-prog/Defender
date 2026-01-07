CREATE TABLE `medication_auto_schedule_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicationId` int NOT NULL,
	`intervalDays` int NOT NULL,
	`intervalType` enum('days','weeks','months','years') NOT NULL DEFAULT 'days',
	`intervalValue` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medication_auto_schedule_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `periodicity` enum('daily','weekly','monthly','custom') DEFAULT 'daily';--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `customInterval` int;--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `weekDays` text;--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `monthDays` text;--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `autoSchedule` boolean DEFAULT false NOT NULL;