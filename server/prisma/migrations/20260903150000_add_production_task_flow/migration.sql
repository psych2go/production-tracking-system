-- Add normalized product identity for new records. Existing rows stay NULL so legacy duplicates do not block deployment.
ALTER TABLE "products" ADD COLUMN "model_normalized" TEXT;
CREATE UNIQUE INDEX "products_model_normalized_key" ON "products"("model_normalized");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_no" TEXT,
    "batch_no_normalized" TEXT,
    "product_model_normalized" TEXT,
    "order_identity" TEXT,
    "product_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "customer_code" TEXT,
    "order_no" TEXT,
    "package_type" TEXT,
    "customer_delivery" DATETIME,
    "production_delivery" DATETIME,
    "notes" TEXT,
    "created_by" INTEGER,
    "card_created_by" INTEGER,
    "card_created_at" DATETIME,
    "started_by" INTEGER,
    "started_at" DATETIME,
    "cancelled_by" INTEGER,
    "cancelled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batches_card_created_by_fkey" FOREIGN KEY ("card_created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batches_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "batches_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_batches" ("batch_no", "created_at", "created_by", "customer_code", "customer_delivery", "id", "notes", "order_no", "package_type", "priority", "product_id", "production_delivery", "quantity", "status", "updated_at") SELECT "batch_no", "created_at", "created_by", "customer_code", "customer_delivery", "id", "notes", "order_no", "package_type", "priority", "product_id", "production_delivery", "quantity", "status", "updated_at" FROM "batches";
DROP TABLE "batches";
ALTER TABLE "new_batches" RENAME TO "batches";
CREATE UNIQUE INDEX "order_identity_unique" ON "batches"("order_identity");
CREATE UNIQUE INDEX "batch_identity_normalized_unique" ON "batches"("batch_no_normalized", "product_model_normalized");
CREATE INDEX "customer_order_idx" ON "batches"("customer_code", "order_no");
CREATE UNIQUE INDEX "batch_no_product_unique" ON "batches"("batch_no", "product_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

