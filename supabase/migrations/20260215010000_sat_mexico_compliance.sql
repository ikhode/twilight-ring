-- Add CFDI 4.0 Metadata to Sales and Purchases
ALTER TABLE sales ADD COLUMN fiscal_uuid VARCHAR(36);
ALTER TABLE sales ADD COLUMN cfdi_usage VARCHAR(10);
ALTER TABLE sales ADD COLUMN payment_form VARCHAR(2);
ALTER TABLE sales ADD COLUMN fiscal_payment_method VARCHAR(3); -- PUE/PPD
ALTER TABLE sales ADD COLUMN fiscal_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE sales ADD COLUMN billing_zip_code VARCHAR(10);

ALTER TABLE purchases ADD COLUMN fiscal_uuid VARCHAR(36);
ALTER TABLE purchases ADD COLUMN cfdi_usage VARCHAR(10);
ALTER TABLE purchases ADD COLUMN payment_form VARCHAR(2);
ALTER TABLE purchases ADD COLUMN fiscal_payment_method VARCHAR(3); -- PUE/PPD
ALTER TABLE purchases ADD COLUMN fiscal_status VARCHAR(20) DEFAULT 'draft';

-- Enhance Customers and Suppliers for SAT Compliance
ALTER TABLE customers ADD COLUMN tax_regime_id VARCHAR(10); 
ALTER TABLE customers ADD COLUMN zip_code VARCHAR(10);
ALTER TABLE customers ADD COLUMN fiscal_persona_type VARCHAR(10) DEFAULT 'moral'; -- fisica/moral

ALTER TABLE suppliers ADD COLUMN zip_code VARCHAR(10);
ALTER TABLE suppliers ADD COLUMN fiscal_persona_type VARCHAR(10) DEFAULT 'moral';

-- Add SAT Tax Type to Taxes
ALTER TABLE taxes ADD COLUMN sat_tax_type VARCHAR(10); -- 002 (IVA), 001 (ISR), 003 (IEPS)
