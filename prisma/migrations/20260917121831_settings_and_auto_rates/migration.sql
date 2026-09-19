-- AlterTable
ALTER TABLE `Currency` ADD COLUMN `autoRate` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `rateUpdatedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `StoreSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `deliveryFlatKobo` INTEGER NOT NULL DEFAULT 250000,
    `freeDeliveryOverKobo` INTEGER NOT NULL DEFAULT 15000000,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
