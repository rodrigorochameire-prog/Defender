CREATE TABLE `health_behavior_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`petId` int NOT NULL,
	`recordedBy` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`mood` enum('feliz','ansioso','calmo','agitado','letargico','agressivo'),
	`stool` enum('normal','diarreia','constipacao','com_sangue','muco'),
	`behavior` enum('ativo','letargico','agressivo','sociavel','assustado','brincalhao'),
	`appetite` enum('normal','aumentado','diminuido','recusou'),
	`waterIntake` enum('normal','aumentado','diminuido','recusou'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `health_behavior_logs_id` PRIMARY KEY(`id`)
);
