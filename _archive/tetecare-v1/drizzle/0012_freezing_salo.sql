CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`tutorId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`visitDate` timestamp NOT NULL,
	`response` text,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
