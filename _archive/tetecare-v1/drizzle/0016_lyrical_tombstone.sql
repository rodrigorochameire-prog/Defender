CREATE TABLE `change_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource_type` enum('medication','food','preventive','pet_data','calendar') NOT NULL,
	`resource_id` int NOT NULL,
	`pet_id` int NOT NULL,
	`field_name` varchar(100) NOT NULL,
	`old_value` text,
	`new_value` text,
	`changed_by` int NOT NULL,
	`changed_by_role` enum('admin','tutor') NOT NULL,
	`change_type` enum('create','update','delete') NOT NULL,
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `change_history_id` PRIMARY KEY(`id`)
);
