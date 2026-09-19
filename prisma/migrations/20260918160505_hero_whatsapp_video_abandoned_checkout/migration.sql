-- AlterTable
ALTER TABLE `Cart` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `recoveryEmailSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `receiptSentAt` DATETIME(3) NULL,
    ADD COLUMN `recoveryEmailSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `videoUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `StoreSettings` ADD COLUMN `abandonedAfterHours` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `abandonedEmailEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `heroCtaHref` VARCHAR(191) NULL,
    ADD COLUMN `heroCtaLabel` VARCHAR(191) NULL,
    ADD COLUMN `heroEyebrow` TEXT NULL,
    ADD COLUMN `heroLeftImage` TEXT NULL,
    ADD COLUMN `heroRightImage` TEXT NULL,
    ADD COLUMN `heroSubtitle` TEXT NULL,
    ADD COLUMN `heroTitle` TEXT NULL,
    ADD COLUMN `whatsappEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsappMessage` TEXT NULL,
    ADD COLUMN `whatsappNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Cart_updatedAt_idx` ON `Cart`(`updatedAt`);

-- CreateIndex
CREATE INDEX `Order_createdAt_idx` ON `Order`(`createdAt`);
