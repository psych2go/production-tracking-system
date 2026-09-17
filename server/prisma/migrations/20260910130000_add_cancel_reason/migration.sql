-- 取消订单需填写原因：新增取消原因字段
ALTER TABLE "batches" ADD COLUMN "cancel_reason" TEXT;
