ALTER TABLE `transactions` MODIFY COLUMN `type` enum('credit','debit','income','expense') NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `category` varchar(100) NOT NULL;