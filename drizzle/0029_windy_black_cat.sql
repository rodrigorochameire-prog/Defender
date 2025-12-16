CREATE TABLE `food_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('purchase','consumption') NOT NULL,
	`amountKg` int NOT NULL,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currentStockKg` int NOT NULL DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_stock_id` PRIMARY KEY(`id`)
);
