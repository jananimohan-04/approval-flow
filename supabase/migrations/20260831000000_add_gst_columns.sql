-- Add GST verification columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS trade_name TEXT,
ADD COLUMN IF NOT EXISTS gstin_status TEXT,
ADD COLUMN IF NOT EXISTS taxpayer_type TEXT,
ADD COLUMN IF NOT EXISTS constitution_of_business TEXT,
ADD COLUMN IF NOT EXISTS date_of_registration TEXT,
ADD COLUMN IF NOT EXISTS address JSONB;
