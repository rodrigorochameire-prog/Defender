CREATE TABLE `admin_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`invited_by` int NOT NULL,
	`status` enum('pending','accepted','expired') NOT NULL DEFAULT 'pending',
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invites_token_unique` UNIQUE(`token`)
);
