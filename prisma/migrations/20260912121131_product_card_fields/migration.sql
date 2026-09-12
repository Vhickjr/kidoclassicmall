-- AlterTable
ALTER TABLE `Category` ADD COLUMN `imageUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `brand` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `compareAtKobo` INTEGER NULL;
