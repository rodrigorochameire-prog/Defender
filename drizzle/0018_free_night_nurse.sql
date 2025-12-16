CREATE TABLE `preventive_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('flea','deworming') NOT NULL,
	`manufacturer` varchar(200),
	`intervalDays` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `preventive_library_id` PRIMARY KEY(`id`)
);
