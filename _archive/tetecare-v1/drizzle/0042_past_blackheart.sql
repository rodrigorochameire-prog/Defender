CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text,
	`mediaUrl` varchar(500),
	`mediaKey` varchar(500),
	`messageType` enum('text','image','video','audio','document') NOT NULL DEFAULT 'text',
	`whatsappMessageId` varchar(200),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int,
	`participants` json NOT NULL,
	`lastMessageAt` timestamp,
	`unreadCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wall_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wall_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wall_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int,
	`authorId` int NOT NULL,
	`content` text,
	`mediaUrls` json,
	`mediaKeys` json,
	`postType` enum('photo','video','text','mixed') NOT NULL DEFAULT 'text',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wall_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wall_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`reactionType` enum('like','love','laugh','wow','sad') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wall_reactions_id` PRIMARY KEY(`id`)
);
