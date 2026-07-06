-- CreateIndex
CREATE UNIQUE INDEX "batch_no_product_unique" ON "batches"("batch_no", "product_id");
