CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`tutorId` int NOT NULL,
	`bookingDate` timestamp NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
	`numberOfDays` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
