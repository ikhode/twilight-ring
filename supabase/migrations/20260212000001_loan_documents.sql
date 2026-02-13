-- Add Loan Documents support
CREATE TABLE IF NOT EXISTS loan_documents (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    application_id VARCHAR REFERENCES loan_applications(id) ON DELETE CASCADE,
    loan_id VARCHAR REFERENCES loans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'id_front', 'id_back', 'income_proof', 'bank_statement', 'other'
    url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    notes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE loan_documents ENABLE ROW LEVEL SECURITY;

-- Multi-tenant Policy
CREATE POLICY "Users can only access their organization's documents" 
ON loan_documents FOR ALL 
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
