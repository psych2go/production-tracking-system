-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ww_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "model" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "batches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_no" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "process_stages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "is_qc_stage" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "progress_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "batch_id" INTEGER NOT NULL,
    "stage_id" INTEGER NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "input_quantity" INTEGER,
    "output_quantity" INTEGER,
    "defect_quantity" INTEGER NOT NULL DEFAULT 0,
    "defect_type" TEXT,
    "defect_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "duration_minutes" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "progress_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "progress_records_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "process_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "progress_records_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "defect_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "progress_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "stage_id" INTEGER NOT NULL,
    "defect_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'minor',
    "resolution" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" INTEGER,
    "resolved_at" DATETIME,
    "photo_url" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "defect_records_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "progress_records" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "defect_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "defect_records_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "process_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "defect_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "defect_records_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rework_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "defect_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "from_stage_id" INTEGER NOT NULL,
    "to_stage_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "operator_id" INTEGER,
    "rework_result" TEXT,
    "output_quantity" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rework_records_defect_id_fkey" FOREIGN KEY ("defect_id") REFERENCES "defect_records" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rework_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rework_records_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "process_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rework_records_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "process_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "rework_records_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "related_id" INTEGER,
    "related_type" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ww_user_id" ON "users"("ww_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_no" ON "batches"("batch_no");

-- CreateIndex
CREATE UNIQUE INDEX "process_stages_code_key" ON "process_stages"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stage_order" ON "process_stages"("stage_order");

-- CreateIndex
CREATE UNIQUE INDEX "batch_stage_unique" ON "progress_records"("batch_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "rework_records_defect_id_key" ON "rework_records"("defect_id");
