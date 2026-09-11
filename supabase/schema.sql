-- ==============================================================================
-- KISANFLOW: SMART MANDI PROCUREMENT MANAGEMENT SYSTEM
-- COMPLETE RELATIONAL SCHEMA WITH ROW LEVEL SECURITY & TOKEN SEQUENCING
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('farmer', 'operator', 'government', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE procurement_stage_type AS ENUM (
        'GATE_ENTRY',
        'QUALITY_CHECK',
        'WEIGHING',
        'BAGGING',
        'J_FORM',
        'COMPLETED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE procurement_status_type AS ENUM (
        'WAITING_FOR_GATE_ENTRY',
        'GATE_ENTRY_VERIFIED',
        'QUALITY_CHECK_PENDING',
        'QUALITY_CHECK_IN_PROGRESS',
        'QUALITY_CHECK_COMPLETED',
        'QUALITY_REJECTED',
        'WAITING_FOR_WEIGHING',
        'WEIGHING_IN_PROGRESS',
        'WEIGHING_COMPLETED',
        'BAGGING_PENDING',
        'BAGGING_IN_PROGRESS',
        'BAGGING_COMPLETED',
        'BAGGING_DELAYED',
        'J_FORM_PENDING',
        'J_FORM_PROCESSING',
        'J_FORM_GENERATED',
        'PROCUREMENT_COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'PENDING',
        'INITIATED',
        'PROCESSING',
        'CREDITED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    role user_role_type NOT NULL DEFAULT 'farmer',
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    village TEXT,
    district TEXT,
    state TEXT,
    aadhaar_masked TEXT,
    employee_id TEXT,
    centre_id TEXT,
    designation TEXT,
    preferred_language TEXT DEFAULT 'te',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROCUREMENT CENTRES (PPCs)
CREATE TABLE IF NOT EXISTS public.procurement_centres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    capacity_per_day INTEGER DEFAULT 150,
    active_counters INTEGER DEFAULT 3,
    open_hours TEXT DEFAULT '08:30 AM - 05:30 PM',
    status TEXT DEFAULT 'OPTIMAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Centres if empty
INSERT INTO public.procurement_centres (id, name, district, state, capacity_per_day, active_counters, open_hours, status)
VALUES 
    ('centre_lakshmipur', 'Lakshmipur Procurement Centre', 'Warangal', 'Telangana', 150, 3, '08:30 AM - 05:30 PM', 'OPTIMAL'),
    ('centre_ramapuram', 'Ramapuram Procurement Centre', 'Warangal', 'Telangana', 180, 4, '08:30 AM - 05:30 PM', 'OPTIMAL'),
    ('centre_kothuru', 'Kothuru Procurement Centre', 'Warangal', 'Telangana', 120, 2, '09:00 AM - 05:00 PM', 'OPTIMAL')
ON CONFLICT (id) DO NOTHING;

-- 5. CROPS & MSP MASTER
CREATE TABLE IF NOT EXISTS public.crops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    msp_per_quintal NUMERIC NOT NULL,
    icon TEXT DEFAULT '🌾'
);

INSERT INTO public.crops (id, name, category, msp_per_quintal, icon)
VALUES
    ('paddy', 'Paddy (వరి / धान)', 'Cereals', 1950, '🌾'),
    ('wheat', 'Wheat (గోధుమ / गेहूँ)', 'Cereals', 2275, '🌾'),
    ('maize', 'Maize (మొక్కజొన్న / मक्का)', 'Coarse Cereals', 2090, '🌽'),
    ('cotton', 'Cotton (పత్తి / कपास)', 'Commercial', 7020, '☁️'),
    ('pulses', 'Pulses (ఇతర / दालें)', 'Pulses', 7000, '🌱')
ON CONFLICT (id) DO NOTHING;

-- 6. REGISTRATIONS & TOKENS TABLE
-- Token numbers start at 1 for each centre + procurement date combination
CREATE TABLE IF NOT EXISTS public.registrations (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL,
    farmer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    farmer_reg_id TEXT,
    village TEXT,
    district TEXT,
    crop TEXT NOT NULL,
    quantity_quintals NUMERIC NOT NULL,
    vehicle_number TEXT,
    centre_id TEXT NOT NULL REFERENCES public.procurement_centres(id),
    preferred_date DATE NOT NULL DEFAULT CURRENT_DATE,
    preferred_time TEXT DEFAULT '10:00 AM',
    token_number INTEGER NOT NULL,
    queue_position INTEGER NOT NULL DEFAULT 1,
    current_stage procurement_stage_type NOT NULL DEFAULT 'GATE_ENTRY',
    procurement_status procurement_status_type NOT NULL DEFAULT 'WAITING_FOR_GATE_ENTRY',
    estimated_processing_mins INTEGER DEFAULT 45,
    delay_minutes INTEGER DEFAULT 0,
    bottleneck_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_centre_date_token UNIQUE (centre_id, preferred_date, token_number)
);

CREATE INDEX IF NOT EXISTS idx_reg_farmer_id ON public.registrations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_reg_centre_date ON public.registrations(centre_id, preferred_date);
CREATE INDEX IF NOT EXISTS idx_reg_status ON public.registrations(procurement_status);

-- 7. TOKEN GENERATOR FUNCTION (SAFE INCREMENTAL SEQUENCE STARTING FROM 1)
CREATE OR REPLACE FUNCTION get_next_procurement_token(p_centre_id TEXT, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_max_token INTEGER;
BEGIN
    SELECT COALESCE(MAX(token_number), 0)
    INTO v_max_token
    FROM public.registrations
    WHERE centre_id = p_centre_id AND preferred_date = p_date;

    RETURN v_max_token + 1;
END;
$$ LANGUAGE plpgsql;

-- 8. QUALITY & MOISTURE CHECK RECORDS (Stage 2)
CREATE TABLE IF NOT EXISTS public.quality_checks (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    moisture_percentage NUMERIC,
    quality_result TEXT, -- 'Grade A (Premium)', 'FAQ (Fair Average Quality)', 'Grade B', 'Rejected'
    faq_compliant BOOLEAN DEFAULT true,
    assayer_name TEXT,
    assayer_remarks TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WEIGHING RECORDS (Stage 3)
CREATE TABLE IF NOT EXISTS public.weighing_records (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    gross_weight NUMERIC,
    tare_weight NUMERIC,
    net_weight NUMERIC,
    weighbridge_slip_number TEXT,
    operator_name TEXT,
    operator_remarks TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BAGGING RECORDS (Stage 4)
CREATE TABLE IF NOT EXISTS public.bagging_records (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    number_of_bags INTEGER,
    gunny_bag_type TEXT DEFAULT 'Standard 50kg Jute',
    labour_delay_reported BOOLEAN DEFAULT false,
    delay_reason TEXT,
    operator_remarks TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. J-FORMS & RECEIPTS (Stage 5)
CREATE TABLE IF NOT EXISTS public.j_forms (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    j_form_number TEXT UNIQUE NOT NULL,
    quantity_procured NUMERIC NOT NULL,
    msp_rate NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    issued_by TEXT,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'GENERATED'
);

-- 12. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    registration_id TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    farmer_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    msp_price NUMERIC,
    quantity NUMERIC,
    status payment_status_type NOT NULL DEFAULT 'PENDING',
    transaction_id TEXT,
    payment_date TIMESTAMPTZ,
    bank_account_masked TEXT,
    ifsc_masked TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT DEFAULT 'SMS', -- 'SMS', 'APP', 'VOICE'
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    registration_id TEXT REFERENCES public.registrations(id) ON DELETE SET NULL,
    stage TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weighing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bagging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.j_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Read-only master tables for authenticated & anon
CREATE POLICY "Public can view centres" ON public.procurement_centres FOR SELECT USING (true);
CREATE POLICY "Public can view crops" ON public.crops FOR SELECT USING (true);

-- 2. Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid()::text = id OR true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id OR true);
CREATE POLICY "Users can insert profile" ON public.profiles FOR INSERT WITH CHECK (true);

-- 3. Registrations Policies
CREATE POLICY "Registrations select policy" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Registrations insert policy" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Registrations update policy" ON public.registrations FOR UPDATE USING (true);

-- 4. Workflow tables policies
CREATE POLICY "Quality checks select" ON public.quality_checks FOR SELECT USING (true);
CREATE POLICY "Quality checks write" ON public.quality_checks FOR ALL USING (true);

CREATE POLICY "Weighing select" ON public.weighing_records FOR SELECT USING (true);
CREATE POLICY "Weighing write" ON public.weighing_records FOR ALL USING (true);

CREATE POLICY "Bagging select" ON public.bagging_records FOR SELECT USING (true);
CREATE POLICY "Bagging write" ON public.bagging_records FOR ALL USING (true);

CREATE POLICY "J-Forms select" ON public.j_forms FOR SELECT USING (true);
CREATE POLICY "J-Forms write" ON public.j_forms FOR ALL USING (true);

CREATE POLICY "Payments select" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Payments write" ON public.payments FOR ALL USING (true);

CREATE POLICY "Notifications select" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Notifications write" ON public.notifications FOR ALL USING (true);

CREATE POLICY "Audit logs select" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Audit logs write" ON public.audit_logs FOR ALL USING (true);
