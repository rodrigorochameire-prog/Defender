CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`eventDate` timestamp NOT NULL,
	`eventType` enum('holiday','medical','general','vaccination','medication') NOT NULL,
	`petId` int,
	`isAllDay` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`logDate` timestamp NOT NULL,
	`source` enum('home','daycare') NOT NULL,
	`mood` enum('feliz','calmo','ansioso','triste','agitado'),
	`stool` enum('normal','diarreia','constipado','nao_fez'),
	`appetite` enum('normal','aumentado','diminuido','nao_comeu'),
	`behavior` text,
	`activities` text,
	`foodConsumed` varchar(50),
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daycare_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`packageDays` int NOT NULL,
	`packagePrice` int NOT NULL,
	`remainingDays` int NOT NULL,
	`purchaseDate` timestamp NOT NULL DEFAULT (now()),
	`expiryDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daycare_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daycare_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`usageDate` timestamp NOT NULL,
	`checkInTime` timestamp,
	`checkOutTime` timestamp,
	`creditId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daycare_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`category` enum('vaccination','exam','prescription','photo','other') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileName` varchar(255),
	`mimeType` varchar(100),
	`fileSize` int,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medication_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` enum('preventive','treatment','supplement') NOT NULL,
	`description` text,
	`commonDosage` varchar(200),
	`isCommon` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medication_library_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`petId` int,
	`type` enum('vaccine_reminder','medication_reminder','credit_low','daily_update') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`isSent` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pet_medications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`medicationId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`dosage` varchar(200) NOT NULL,
	`frequency` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pet_medications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pet_tutors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`tutorId` int NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pet_tutors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pet_vaccinations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`vaccineId` int NOT NULL,
	`applicationDate` timestamp NOT NULL,
	`nextDueDate` timestamp,
	`doseNumber` int DEFAULT 1,
	`veterinarian` varchar(200),
	`clinic` varchar(200),
	`batchNumber` varchar(100),
	`notes` text,
	`documentUrl` text,
	`documentKey` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pet_vaccinations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`breed` varchar(100),
	`age` varchar(50),
	`weight` int,
	`birthDate` timestamp,
	`photoUrl` text,
	`photoKey` text,
	`status` enum('checked-in','checked-out') NOT NULL DEFAULT 'checked-out',
	`checkInTime` timestamp,
	`checkOutTime` timestamp,
	`foodBrand` varchar(200),
	`foodAmount` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int,
	`type` enum('credit','debit') NOT NULL,
	`category` enum('daycare_package','daycare_usage','grooming','veterinary','other') NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` int NOT NULL,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vaccine_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`intervalDays` int,
	`dosesRequired` int DEFAULT 1,
	`isCommon` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vaccine_library_id` PRIMARY KEY(`id`)
);
