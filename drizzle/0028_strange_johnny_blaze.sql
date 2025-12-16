CREATE TABLE `custom_pricing_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` int NOT NULL,
	`planName` varchar(200) NOT NULL,
	`description` text,
	`crechePrice` int,
	`diariaPrice` int,
	`discountPercent` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_pricing_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceType` enum('creche','diaria') NOT NULL,
	`priceInCents` int NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_prices_serviceType_unique` UNIQUE(`serviceType`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `serviceType` enum('creche','diaria') DEFAULT 'creche' NOT NULL;