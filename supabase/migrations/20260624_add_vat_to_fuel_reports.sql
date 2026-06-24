-- Add VAT breakdown to fuel reports
ALTER TABLE fuel_reports
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 23,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2) DEFAULT 0;

-- Backfill existing fuel reports with VAT calculations
UPDATE fuel_reports
SET
  vat_rate = 23,
  net_amount = ROUND(total_cost / 1.23, 2),
  vat_amount = ROUND(total_cost - (total_cost / 1.23), 2)
WHERE vat_amount = 0 AND net_amount = 0;
