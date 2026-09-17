-- 已取消订单不再占用唯一键：批号+型号、客户代码+订单编号在取消后可被新订单复用
-- 1. 移除旧的批号+型号唯一索引（由 batch_identity 可空唯一键替代，取消时置 NULL 释放）
DROP INDEX IF EXISTS "batch_no_product_unique";
DROP INDEX IF EXISTS "batch_identity_normalized_unique";

-- 2. 新增 batch_identity：非取消且已制卡批次持有「归一化批号+归一化型号」，取消时置 NULL
ALTER TABLE "batches" ADD COLUMN "batch_identity" TEXT;
CREATE UNIQUE INDEX "batch_identity_active_unique" ON "batches"("batch_identity");

-- 3. 回填存量：非取消且已制卡的批次
UPDATE "batches"
SET "batch_identity" = "batch_no_normalized" || char(0) || "product_model_normalized"
WHERE status != 'cancelled'
  AND "batch_no_normalized" IS NOT NULL
  AND "product_model_normalized" IS NOT NULL;

-- 4. 存量已取消订单释放订单编号唯一键（SQLite 唯一索引不约束 NULL）
UPDATE "batches" SET "order_identity" = NULL WHERE status = 'cancelled';
