ALTER TABLE `daily_logs` ADD `behaviorNotes` text;--> statement-breakpoint
ALTER TABLE `daily_logs` ADD `feedingTime` varchar(10);--> statement-breakpoint
ALTER TABLE `daily_logs` ADD `feedingAmount` varchar(100);--> statement-breakpoint
ALTER TABLE `daily_logs` ADD `feedingAcceptance` enum('excelente','boa','regular','ruim','recusou');