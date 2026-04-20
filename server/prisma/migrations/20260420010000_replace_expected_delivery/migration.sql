-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_no" TEXT NOT NULL,
    "batch_type" TEXT NOT NULL DEFAULT 'product',
    "product_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "customer_code" TEXT,
    "order_no" TEXT,
    "package_type" TEXT,
    "customer_delivery" DATETIME,
    "production_delivery" DATETIME,
    "trial_content" TEXT,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_batches" ("batch_no", "batch_type", "created_at", "created_by", "customer_code", "id", "notes", "order_no", "package_type", "priority", "product_id", "quantity", "status", "trial_content", "updated_at") SELECT "batch_no", "batch_type", "created_at", "created_by", "customer_code", "id", "notes", "order_no", "package_type", "priority", "product_id", "quantity", "status", "trial_content", "updated_at" FROM "batches";
DROP TABLE "batches";
ALTER TABLE "new_batches" RENAME TO "batches";
CREATE UNIQUE INDEX "batch_no" ON "batches"("batch_no");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
