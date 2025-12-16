CREATE TABLE `behaviorRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`date` timestamp NOT NULL,
	`location` varchar(50) NOT NULL,
	`behaviorType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`tags` text,
	`severity` varchar(20),
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `behaviorRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainingProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`skill` varchar(100) NOT NULL,
	`startDate` timestamp NOT NULL,
	`currentLevel` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainingProgress_id` PRIMARY KEY(`id`)
);
