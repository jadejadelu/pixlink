-- AlterTable
ALTER TABLE `User` MODIFY `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `AccountActivation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AccountActivation_token_key`(`token`),
    INDEX `AccountActivation_userId_idx`(`userId`),
    INDEX `AccountActivation_token_idx`(`token`),
    INDEX `AccountActivation_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccountActivation` ADD CONSTRAINT `AccountActivation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
