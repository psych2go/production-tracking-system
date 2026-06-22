-- Drop unused defect/quantity tracking fields from progress_records (frontend never reads them)

ALTER TABLE "progress_records" DROP COLUMN "input_quantity";
ALTER TABLE "progress_records" DROP COLUMN "output_quantity";
ALTER TABLE "progress_records" DROP COLUMN "defect_quantity";
ALTER TABLE "progress_records" DROP COLUMN "defect_type";
ALTER TABLE "progress_records" DROP COLUMN "defect_notes";
