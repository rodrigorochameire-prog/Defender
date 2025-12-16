CREATE TABLE `whatsappConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`petId` int,
	`phoneNumber` varchar(20) NOT NULL,
	`status` enum('active','resolved','pending') NOT NULL DEFAULT 'active',
	`lastMessageAt` timestamp,
	`lastMessageContent` text,
	`unreadCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `whatsappMessages` ADD `conversationId` int;