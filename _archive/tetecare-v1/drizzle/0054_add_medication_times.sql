/*
  # Add Administration Times to Medications

  1. Changes
    - Add `administrationTimes` column to `pet_medications` table
      - Stores JSON array of time strings (e.g., ["08:00", "20:00"])
      - Allows flexible scheduling of medication doses throughout the day

  2. Purpose
    - Enable tutors and admins to set specific times for medication administration
    - Integrate with calendar system for automated reminders
    - Support multiple daily doses with custom timing
*/

-- Add administration times field to pet_medications
ALTER TABLE `pet_medications`
ADD COLUMN IF NOT EXISTS `administrationTimes` TEXT COMMENT 'JSON array of administration times in HH:MM format';
