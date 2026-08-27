BEGIN;

ALTER TABLE public.data_sources ADD COLUMN IF NOT EXISTS schema_snapshot JSONB;

-- Note: We are dropping row_data to enforce the strictly headless Drive-As-Source-Of-Truth approach.
ALTER TABLE public.data_source_rows DROP COLUMN IF EXISTS row_data;

COMMIT;
