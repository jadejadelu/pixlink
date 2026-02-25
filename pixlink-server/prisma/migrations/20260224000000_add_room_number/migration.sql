-- Add roomNumber field to Room table
-- This field provides a user-friendly way to share and join rooms

-- Add roomNumber column with unique constraint
ALTER TABLE `Room` ADD COLUMN `roomNumber` VARCHAR(191) NOT NULL UNIQUE AFTER `id`;

-- Add optional password for private rooms
ALTER TABLE `Room` ADD COLUMN `password` VARCHAR(191) NULL AFTER `name`;

-- Add maxPlayers with default value of 8
ALTER TABLE `Room` ADD COLUMN `maxPlayers` INT NOT NULL DEFAULT 8 AFTER `password`;

-- Add gameType to identify the game
ALTER TABLE `Room` ADD COLUMN `gameType` VARCHAR(191) NULL AFTER `maxPlayers`;

-- Create index on roomNumber for faster lookups
CREATE INDEX `Room_roomNumber_idx` ON `Room`(`roomNumber`);
