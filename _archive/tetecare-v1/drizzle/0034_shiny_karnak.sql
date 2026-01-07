CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('vaccine_reminder_7d','vaccine_reminder_1d','medication_reminder','checkin_notification','checkout_notification','daily_report','credits_low','event_reminder') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`availableVariables` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_type_unique` UNIQUE(`type`)
);
--> statement-breakpoint
CREATE TABLE `tutor_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` int NOT NULL,
	`notificationType` enum('vaccine_reminder_7d','vaccine_reminder_1d','medication_reminder','checkin_notification','checkout_notification','daily_report','credits_low','event_reminder') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`adminOverride` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_notification_preferences_id` PRIMARY KEY(`id`)
);
