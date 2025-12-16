ALTER TABLE `daycare_usage` ADD `amountCents` int;--> statement-breakpoint
ALTER TABLE `daycare_usage` ADD `paymentStatus` enum('pending','paid','cancelled') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `daycare_usage` ADD `paidAt` timestamp;--> statement-breakpoint
ALTER TABLE `daycare_usage` ADD `notes` text;