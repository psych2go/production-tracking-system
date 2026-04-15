-- AlterTable
ALTER TABLE `batches` ADD COLUMN `batch_type` TEXT NOT NULL DEFAULT 'product';
ALTER TABLE `batches` ADD COLUMN `trial_content` TEXT;

-- Make product_id nullable for trial batches
-- SQLite doesn't support ALTER COLUMN, recreate table
CREATE TABLE `batches_new` (
    `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    `batch_no` TEXT NOT NULL,
    `batch_type` TEXT NOT NULL DEFAULT 'product',
    `product_id` INTEGER,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `status` TEXT NOT NULL DEFAULT 'active',
    `priority` TEXT NOT NULL DEFAULT 'normal',
    `customer_code` TEXT,
    `order_no` TEXT,
    `package_type` TEXT,
    `expected_delivery` DATETIME,
    `trial_content` TEXT,
    `notes` TEXT,
    `created_by` INTEGER,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL,
    CONSTRAINT `batch_no` UNIQUE (`batch_no`),
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO `batches_new` SELECT * FROM `batches`;

DROP TABLE `batches`;

ALTER TABLE `batches_new` RENAME TO `batches`;

CREATE INDEX `batches_product_id_idx` ON `batches`(`product_id`);
CREATE INDEX `batches_created_by_idx` ON `batches`(`created_by`);
