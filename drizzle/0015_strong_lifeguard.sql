CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_id` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`target_type` varchar(50),
	`target_id` int,
	`details` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
