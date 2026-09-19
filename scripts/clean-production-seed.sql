-- ---------------------------------------------------------------------------
-- Clears the demo catalogue out of the LIVE Hostinger database.
--
-- Run this AFTER `prisma migrate deploy`, so every table it mentions exists.
--
-- Why it is needed: the placeholder products carry picsum.photos image URLs,
-- and that host is no longer allowed through next/image. Left in place they
-- make the live product and home pages throw instead of render.
--
-- What it keeps: your user accounts, categories, currencies, store settings,
-- discount codes and subscribers. Only the demo catalogue and the test orders
-- that reference it are removed.
--
-- This cannot be undone. Take a backup in hPanel first if you want a way back.
-- ---------------------------------------------------------------------------

-- Orders first: OrderItem pins variants with ON DELETE RESTRICT, so the
-- products cannot be removed while these rows still point at them.
DELETE FROM OrderItem;
DELETE FROM `Order`;

DELETE FROM Notification;
DELETE FROM CartItem;
DELETE FROM Cart;
DELETE FROM Review;
DELETE FROM WishlistItem;

-- Instagram stories shipped with placeholder media too.
DELETE FROM StoryItem;
DELETE FROM Story;

-- The demo catalogue itself.
DELETE FROM ProductVariant;
DELETE FROM Product;

-- Category names are real, only their pictures were placeholders.
UPDATE Category SET imageUrl = NULL WHERE imageUrl LIKE '%picsum%';

-- Anything obviously left over from testing.
DELETE FROM Category WHERE slug = 'tech';

-- Check what survived.
SELECT 'products'   AS table_name, COUNT(*) AS rows_left FROM Product
UNION ALL SELECT 'orders',     COUNT(*) FROM `Order`
UNION ALL SELECT 'categories', COUNT(*) FROM Category
UNION ALL SELECT 'users',      COUNT(*) FROM User
UNION ALL SELECT 'currencies', COUNT(*) FROM Currency;
