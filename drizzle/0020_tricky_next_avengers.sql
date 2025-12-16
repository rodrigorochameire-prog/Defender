CREATE TABLE `whatsappAutomations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`triggerType` enum('photo_added','vaccine_reminder_7d','vaccine_reminder_1d','checkin','checkout','daily_report','medication_applied','preventive_reminder') NOT NULL,
	`templateId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappAutomations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKey` text,
	`phoneNumberId` varchar(100),
	`businessAccountId` varchar(100),
	`webhookSecret` text,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappGroupMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int,
	`phone` varchar(20) NOT NULL,
	`name` varchar(200),
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	`removedAt` timestamp,
	CONSTRAINT `whatsappGroupMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`groupName` varchar(200) NOT NULL,
	`whatsappGroupId` varchar(100),
	`inviteLink` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int,
	`recipientPhone` varchar(20) NOT NULL,
	`recipientName` varchar(200),
	`messageContent` text NOT NULL,
	`mediaUrl` text,
	`status` enum('queued','sent','delivered','read','failed') NOT NULL DEFAULT 'queued',
	`whatsappMessageId` varchar(100),
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`readAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsappMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` enum('welcome','booking_confirmation','vaccine_reminder','checkin','checkout','daily_report','new_photo','medication_applied','preventive_reminder','custom') NOT NULL,
	`content` text NOT NULL,
	`variables` json,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappTemplates_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsappTemplates_name_unique` UNIQUE(`name`)
);
