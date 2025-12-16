ALTER TABLE `pet_medications` ADD `dosageProgression` enum('stable','increase','decrease') DEFAULT 'stable';--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `progressionRate` varchar(50);--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `progressionInterval` int;--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `targetDosage` varchar(200);--> statement-breakpoint
ALTER TABLE `pet_medications` ADD `currentDoseCount` int DEFAULT 0 NOT NULL;