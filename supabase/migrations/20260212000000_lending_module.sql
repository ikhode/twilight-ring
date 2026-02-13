-- Create Enums for Lending
DO $$ BEGIN
    CREATE TYPE loan_status AS ENUM ('pending', 'active', 'completed', 'defaulted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE loan_type AS ENUM ('personal', 'business', 'collateralized', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE repayment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Loan Applications Table
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id character varying PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id character varying NOT NULL REFERENCES public.organizations(id),
    customer_id character varying NOT NULL REFERENCES public.customers(id),
    requested_amount integer NOT NULL, -- in cents
    requested_term_months integer NOT NULL,
    interest_rate_offered numeric(5,2),
    status loan_status DEFAULT 'pending',
    risk_score integer DEFAULT 0,
    ai_assessment jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Loans Table
CREATE TABLE IF NOT EXISTS public.loans (
    id character varying PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id character varying NOT NULL REFERENCES public.organizations(id),
    customer_id character varying NOT NULL REFERENCES public.customers(id),
    application_id character varying REFERENCES public.loan_applications(id),
    amount integer NOT NULL, -- in cents
    interest_rate numeric(5,2) NOT NULL,
    term_months integer NOT NULL,
    status loan_status DEFAULT 'active',
    type loan_type DEFAULT 'personal',
    start_date date DEFAULT current_date,
    end_date date,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Repayment Schedules Table
CREATE TABLE IF NOT EXISTS public.repayment_schedules (
    id character varying PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id character varying NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    organization_id character varying NOT NULL REFERENCES public.organizations(id),
    due_date date NOT NULL,
    amount_due integer NOT NULL, -- in cents
    principal_due integer NOT NULL,
    interest_due integer NOT NULL,
    status repayment_status DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Loan Payments Table (Linked to Finance/Payments if needed)
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id character varying PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id character varying NOT NULL REFERENCES public.loans(id),
    organization_id character varying NOT NULL REFERENCES public.organizations(id),
    repayment_schedule_id character varying REFERENCES public.repayment_schedules(id),
    amount_paid integer NOT NULL,
    payment_date timestamp with time zone DEFAULT now(),
    transaction_id character varying, -- Reference to external finance transaction
    created_at timestamp with time zone DEFAULT now()
);

-- Loan Collateral Table
CREATE TABLE IF NOT EXISTS public.loan_collateral (
    id character varying PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id character varying NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    organization_id character varying NOT NULL REFERENCES public.organizations(id),
    description text NOT NULL,
    estimated_value integer NOT NULL,
    status text DEFAULT 'active',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_collateral ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's loan applications" ON public.loan_applications
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's loan applications" ON public.loan_applications
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their organization's loans" ON public.loans
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's loans" ON public.loans
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their organization's repayment schedules" ON public.repayment_schedules
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's repayment schedules" ON public.repayment_schedules
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their organization's loan payments" ON public.loan_payments
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's loan payments" ON public.loan_payments
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can view their organization's loan collateral" ON public.loan_collateral
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their organization's loan collateral" ON public.loan_collateral
    FOR ALL USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()::text));
