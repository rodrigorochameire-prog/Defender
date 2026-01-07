CREATE TABLE `pet_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`photoKey` text NOT NULL,
	`caption` text,
	`takenAt` timestamp NOT NULL,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pet_photos_id` PRIMARY KEY(`id`)
);
