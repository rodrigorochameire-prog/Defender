CREATE TABLE `pet_food_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`brandName` varchar(200) NOT NULL,
	`currentStock` int NOT NULL,
	`dailyConsumption` int NOT NULL,
	`alertThresholdDays` int NOT NULL DEFAULT 15,
	`lastPurchaseDate` timestamp,
	`lastPurchaseAmount` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pet_food_stock_id` PRIMARY KEY(`id`)
);
