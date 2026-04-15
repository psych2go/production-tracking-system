/*
  Warnings:

  - You are about to drop the `defect_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rework_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "batches" ADD COLUMN "customer_code" TEXT;
ALTER TABLE "batches" ADD COLUMN "expected_delivery" DATETIME;
ALTER TABLE "batches" ADD COLUMN "package_type" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "defect_records";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "notifications";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "rework_records";
PRAGMA foreign_keys=on;
