CREATE TABLE `photo_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`photoId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photo_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `photo_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`photoId` int NOT NULL,
	`userId` int NOT NULL,
	`reactionType` enum('like','love','laugh') NOT NULL DEFAULT 'like',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photo_reactions_id` PRIMARY KEY(`id`)
);
