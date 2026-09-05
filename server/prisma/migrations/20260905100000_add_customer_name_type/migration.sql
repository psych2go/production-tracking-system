-- Customer display name and internal/external classification for statistics.
ALTER TABLE "customer_codes" ADD COLUMN "name" TEXT;
ALTER TABLE "customer_codes" ADD COLUMN "type" TEXT;
