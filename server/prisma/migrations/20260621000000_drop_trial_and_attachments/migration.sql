-- Drop trial batch features and batch attachments (trial-only)

DROP TABLE "batch_attachments";

ALTER TABLE "batches" DROP COLUMN "batch_type";
ALTER TABLE "batches" DROP COLUMN "trial_content";
ALTER TABLE "batches" DROP COLUMN "quantity_detail";
