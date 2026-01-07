CREATE TABLE `dewormingTreatments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`productName` varchar(200) NOT NULL,
	`applicationDate` timestamp NOT NULL,
	`nextDueDate` timestamp NOT NULL,
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dewormingTreatments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fleaTreatments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`productName` varchar(200) NOT NULL,
	`applicationDate` timestamp NOT NULL,
	`nextDueDate` timestamp NOT NULL,
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fleaTreatments_id` PRIMARY KEY(`id`)
);
