-- AlterTable
ALTER TABLE `Certificate` ADD COLUMN `permitEmail` VARCHAR(191) NULL,
    ADD COLUMN `permitSent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `permitSentAt` DATETIME(3) NULL;
