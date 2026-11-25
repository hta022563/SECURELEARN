-- Lesson video processing state for the MediaConvert upload pipeline.
-- Lambda runs with spring.jpa.hibernate.ddl-auto=none, so run this once on the RDS database
-- before deploying the upload group (local docker-compose adds the columns itself via ddl-auto=update).
-- Safe to run twice. Existing lessons keep video_status NULL, which the app treats as READY.

ALTER TABLE lesson ADD COLUMN IF NOT EXISTS video_status      VARCHAR(20);
ALTER TABLE lesson ADD COLUMN IF NOT EXISTS processing_job_id VARCHAR(100);
ALTER TABLE lesson ADD COLUMN IF NOT EXISTS pending_url       VARCHAR(255);
ALTER TABLE lesson ADD COLUMN IF NOT EXISTS source_key        VARCHAR(255);
ALTER TABLE lesson ADD COLUMN IF NOT EXISTS processing_error  VARCHAR(500);
