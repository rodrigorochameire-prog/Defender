CREATE TABLE `booking_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`tutorId` varchar(64) NOT NULL,
	`requestedDates` json NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`adminNotes` text,
	`approvedBy` varchar(64),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `booking_requests_id` PRIMARY KEY(`id`)
);
