-- Custom variation options, and the constraint change they require.
--
-- A variant can now carry extra key/value pairs (Material: Silk, Fit: Slim)
-- alongside size and colour, so the same size/colour pair can legitimately
-- exist more than once on a product. The old unique index forbade exactly
-- that, so it becomes a plain index.
--
-- Written by hand rather than taken from `prisma migrate diff`: that output
-- dropped ProductVariant's foreign key to Product without ever adding it back,
-- which would have quietly removed referential integrity in production.

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `customOptions` JSON NULL;

-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `customOptions` JSON NULL;

-- MySQL will not let the index a foreign key depends on be dropped while the
-- constraint is in place, so it comes off first and goes straight back on.
ALTER TABLE `ProductVariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;

-- DropIndex
DROP INDEX `ProductVariant_productId_size_color_key` ON `ProductVariant`;

-- CreateIndex
CREATE INDEX `ProductVariant_productId_size_color_idx` ON `ProductVariant`(`productId`, `size`, `color`);

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
