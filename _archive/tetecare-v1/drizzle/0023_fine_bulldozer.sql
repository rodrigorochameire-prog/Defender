CREATE TABLE `credit_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`credits` int NOT NULL,
	`priceInCents` int NOT NULL,
	`discountPercent` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_packages_id` PRIMARY KEY(`id`)
);
