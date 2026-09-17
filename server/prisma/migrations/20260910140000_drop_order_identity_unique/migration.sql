-- 订单编号不再强制唯一：同一订单号可对应多个型号/封装形式的订单
DROP INDEX IF EXISTS "order_identity_unique";
ALTER TABLE "batches" DROP COLUMN "order_identity";
