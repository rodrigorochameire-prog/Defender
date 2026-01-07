CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripe_payment_intent_id` varchar(255) NOT NULL,
	`stripe_customer_id` varchar(255),
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'brl',
	`status` varchar(50) NOT NULL,
	`product_type` varchar(50) NOT NULL,
	`product_key` varchar(100),
	`credits_added` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_customer_id` varchar(255);