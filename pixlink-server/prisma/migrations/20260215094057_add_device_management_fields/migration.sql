-- AlterTable
ALTER TABLE `Certificate` ADD COLUMN `isJoinedMesh` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `rememberDevice` BOOLEAN NOT NULL DEFAULT true;
