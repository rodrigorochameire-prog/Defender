/*
  # Add 'user' to changed_by_role enum

  1. Changes
    - Modifies the `changed_by_role` column in `change_history` table to include 'user' value
    - This allows non-admin users (tutors/pet owners) to have their changes tracked

  2. Notes
    - MySQL ENUM modification requires recreating the column
    - Temporarily stores existing data, drops and recreates column with new enum values
*/

-- Add 'user' to the changed_by_role enum
ALTER TABLE `change_history`
MODIFY COLUMN `changed_by_role` ENUM('admin', 'tutor', 'user') NOT NULL;
