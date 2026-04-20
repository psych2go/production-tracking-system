-- CreateTable
CREATE TABLE "schedule_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stage_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "order_num" INTEGER NOT NULL,
    CONSTRAINT "schedule_orders_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "process_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "schedule_orders_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_stage_batch_unique" ON "schedule_orders"("stage_id", "batch_id");
