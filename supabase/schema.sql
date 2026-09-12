-- ==============================================================================
-- KISANFLOW: SMART MANDI PROCUREMENT MANAGEMENT SYSTEM
-- COMPLETE RELATIONAL SCHEMA v2 — REAL SUPABASE AUTH + STRICT RLS
-- Run this in Supabase SQL Editor to set up / update the database.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA extensions; -- optional for geo queries

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('farmer', 'operator', 'government', 'support');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE procurement_stage_type AS ENUM (
        'GATE_ENTRY','QUALITY_CHECK','WEIGHING','BAGGING','J_FORM','COMPLETED','REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE procurement_status_type AS ENUM (
        'WAITING_FOR_GATE_ENTRY','GATE_ENTRY_VERIFIED',
        'QUALITY_CHECK_PENDING','QUALITY_CHECK_IN_PROGRESS','QUALITY_CHECK_COMPLETED','QUALITY_REJECTED',
        'WAITING_FOR_WEIGHING','WEIGHING_IN_PROGRESS','WEIGHING_COMPLETED',
        'BAGGING_PENDING','BAGGING_IN_PROGRESS','BAGGING_COMPLETED','BAGGING_DELAYED',
        'J_FORM_PENDING','J_FORM_PROCESSING','J_FORM_GENERATED','PROCUREMENT_COMPLETED'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM ('PENDING','INITIATED','PROCESSING','CREDITED','FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. PROFILES TABLE — linked to Supabase Auth (auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        user_role_type NOT NULL DEFAULT 'farmer',
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    -- Full address
    address     TEXT,
    village     TEXT,
    mandal      TEXT,
    district    TEXT,
    state       TEXT,
    pincode     TEXT,
    -- Geocoded coordinates (populated server-side or by client after Nominatim lookup)
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    -- Farmer-specific
    aadhaar_masked  TEXT,
    land_holding_acres NUMERIC,
    preferred_language TEXT DEFAULT 'te',
    -- Operator / Govt specific
    employee_id TEXT,
    centre_id   TEXT,
    designation TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. PROCUREMENT CENTRES — dynamic, no hard-coded limit
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.procurement_centres (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name                TEXT NOT NULL,
    address             TEXT,
    district            TEXT NOT NULL,
    state               TEXT NOT NULL,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    capacity_per_day    INTEGER DEFAULT 150,
    active_counters     INTEGER DEFAULT 3,
    open_hours          TEXT DEFAULT '08:00 AM - 06:00 PM',
    status              TEXT DEFAULT 'OPTIMAL',
    accepted_crops      TEXT[] DEFAULT '{}',
    contact             TEXT,
    avg_processing_mins INTEGER DEFAULT 45,
    current_queue       INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with real Telangana / AP centres (can be extended via admin panel)
INSERT INTO public.procurement_centres
  (id, name, address, district, state, latitude, longitude, capacity_per_day, active_counters, open_hours, status, accepted_crops, avg_processing_mins)
VALUES
  ('ctr_wgl_lakshmipur', 'Lakshmipur Government Procurement Centre',
   'Lakshmipur Village, Warangal Rural, Telangana 506101',
   'Warangal', 'Telangana', 17.9784, 79.5941, 150, 3, '08:30 AM - 05:30 PM', 'OPTIMAL',
   ARRAY['Paddy','Maize','Jowar'], 45),
  ('ctr_wgl_ramapuram', 'Ramapuram APMC Procurement Centre',
   'Ramapuram, Warangal Urban, Telangana 506002',
   'Warangal', 'Telangana', 18.0023, 79.5702, 180, 4, '08:00 AM - 06:00 PM', 'OPTIMAL',
   ARRAY['Paddy','Cotton','Soybean'], 40),
  ('ctr_wgl_kothuru', 'Kothuru Primary Processing Centre',
   'Kothuru Mandal, Warangal, Telangana 506330',
   'Warangal', 'Telangana', 17.9345, 79.6112, 120, 2, '09:00 AM - 05:00 PM', 'OPTIMAL',
   ARRAY['Paddy','Maize'], 50),
  -- AP Centres
  ('ctr_gun_mangalgiri', 'Mangalagiri APMC Market Yard',
   'Mangalagiri, Guntur, Andhra Pradesh 522503',
   'Guntur', 'Andhra Pradesh', 16.4305, 80.5683, 200, 5, '07:00 AM - 06:00 PM', 'OPTIMAL',
   ARRAY['Chilli','Paddy','Cotton'], 35),
  ('ctr_kg_kakinada', 'Kakinada East Godavari Procurement Centre',
   'Kakinada, East Godavari, Andhra Pradesh 533001',
   'East Godavari', 'Andhra Pradesh', 16.9891, 82.2475, 180, 4, '08:00 AM - 05:30 PM', 'OPTIMAL',
   ARRAY['Paddy','Coconut','Sugarcane'], 45),
  -- Punjab Centres
  ('ctr_pun_ludhiana', 'Ludhiana Grain Market',
   'Ludhiana Grain Market, Ludhiana, Punjab 141001',
   'Ludhiana', 'Punjab', 30.9010, 75.8573, 300, 8, '07:00 AM - 07:00 PM', 'OPTIMAL',
   ARRAY['Wheat','Paddy','Maize','Barley'], 30),
  ('ctr_pun_amritsar', 'Amritsar Central Mandi',
   'Amritsar APMC Market, Amritsar, Punjab 143001',
   'Amritsar', 'Punjab', 31.6340, 74.8723, 250, 6, '07:00 AM - 06:00 PM', 'OPTIMAL',
   ARRAY['Wheat','Paddy','Mustard'], 35),
  -- Maharashtra
  ('ctr_mah_nagpur', 'Nagpur Central Market Yard',
   'Kalamna Market, Nagpur, Maharashtra 440023',
   'Nagpur', 'Maharashtra', 21.1458, 79.0882, 200, 5, '07:30 AM - 06:00 PM', 'OPTIMAL',
   ARRAY['Soybean','Cotton','Jowar','Wheat'], 40),
  -- Karnataka
  ('ctr_kar_belgaum', 'Belagavi APMC Market',
   'APMC Market, Belagavi, Karnataka 590001',
   'Belagavi', 'Karnataka', 15.8497, 74.4977, 175, 4, '08:00 AM - 06:00 PM', 'OPTIMAL',
   ARRAY['Paddy','Jowar','Sugarcane','Groundnut'], 40)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 5. CROPS & MSP MASTER TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.crops (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    local_name      TEXT,
    scientific_name TEXT,
    category        TEXT NOT NULL,
    msp_per_quintal NUMERIC NOT NULL DEFAULT 0,
    icon            TEXT DEFAULT '🌾',
    season          TEXT,
    primary_states  TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Extended crop seed data
INSERT INTO public.crops (id, name, local_name, category, msp_per_quintal, icon, season, primary_states)
VALUES
  ('paddy',     'Paddy',                'వరి / धान / ধান',            'Kharif Cereal',     2300, '🌾', 'Kharif', ARRAY['Telangana','Andhra Pradesh','Tamil Nadu','West Bengal','Punjab','Haryana']),
  ('wheat',     'Wheat',               'గోధుమ / गेहूँ / ਕਣਕ',        'Rabi Cereal',       2275, '🌾', 'Rabi',   ARRAY['Punjab','Haryana','Uttar Pradesh','Madhya Pradesh','Rajasthan']),
  ('maize',     'Maize',               'మొక్కజొన్న / मक्का',          'Cereal',            2225, '🌽', 'Kharif', ARRAY['Karnataka','Andhra Pradesh','Telangana','Rajasthan','Bihar']),
  ('jowar',     'Jowar (Sorghum)',     'జొన్న / ज्वार / ಜೋಳ',         'Kharif Cereal',     3371, '🌾', 'Kharif', ARRAY['Maharashtra','Karnataka','Telangana']),
  ('bajra',     'Bajra',              'సజ్జ / बाजरा',                  'Kharif Cereal',     2625, '🌾', 'Kharif', ARRAY['Rajasthan','Gujarat','Haryana','Uttar Pradesh']),
  ('ragi',      'Ragi',               'రాగులు / रागी / ರಾಗಿ',          'Kharif Cereal',     4290, '🌾', 'Kharif', ARRAY['Karnataka','Tamil Nadu','Andhra Pradesh','Telangana']),
  ('arhar',     'Arhar/Tur',          'కంది / अरहर / ತೊಗರಿ',          'Kharif Pulse',      7550, '🌱', 'Kharif', ARRAY['Maharashtra','Karnataka','Telangana','Andhra Pradesh']),
  ('moong',     'Moong (Green Gram)', 'పెసలు / मूंग / ಹೆಸರು',          'Kharif Pulse',      8682, '🌱', 'Kharif', ARRAY['Rajasthan','Andhra Pradesh','Telangana']),
  ('urad',      'Urad (Black Gram)',  'మినుములు / उड़द / ಉದ್ದು',        'Kharif Pulse',      7400, '🌱', 'Kharif', ARRAY['Madhya Pradesh','Andhra Pradesh','Telangana']),
  ('chana',     'Chana (Gram)',       'శనగలు / चना / ಕಡಲೆ',            'Rabi Pulse',        5440, '🌱', 'Rabi',   ARRAY['Madhya Pradesh','Rajasthan','Uttar Pradesh','Maharashtra']),
  ('groundnut', 'Groundnut',          'వేరుశనగ / मूंगफली / ಕಡಲೆಕಾಯಿ', 'Kharif Oilseed',   6783, '🥜', 'Kharif', ARRAY['Gujarat','Andhra Pradesh','Telangana','Karnataka']),
  ('soybean',   'Soybean',            'సోయాబీన్ / सोयाबीन',            'Kharif Oilseed',   4892, '🫘', 'Kharif', ARRAY['Madhya Pradesh','Maharashtra','Rajasthan']),
  ('mustard',   'Mustard',            'ఆవాలు / सरसों / ಸಾಸಿವೆ',        'Rabi Oilseed',     5950, '🌿', 'Rabi',   ARRAY['Rajasthan','Uttar Pradesh','Haryana']),
  ('cotton',    'Cotton',             'పత్తి / कपास / ಹತ್ತಿ',           'Kharif Commercial', 7121,'☁️', 'Kharif', ARRAY['Gujarat','Maharashtra','Telangana','Andhra Pradesh','Karnataka']),
  ('sugarcane', 'Sugarcane',          'చెరకు / गन्ना / ಕಬ್ಬು',          'Commercial',         340, '🎋', 'Annual', ARRAY['Uttar Pradesh','Maharashtra','Karnataka','Tamil Nadu','Andhra Pradesh']),
  ('sunflower', 'Sunflower',          'పొద్దుతిరుగుడు / सूरजमुखी',      'Kharif Oilseed',   7280, '🌻', 'Kharif', ARRAY['Karnataka','Andhra Pradesh','Telangana','Maharashtra']),
  ('sesame',    'Sesame (Til)',        'నువ్వులు / तिल / ఎళ్ళు',         'Kharif Oilseed',   9267, '🌿', 'Kharif', ARRAY['West Bengal','Uttar Pradesh','Rajasthan','Telangana']),
  ('jute',      'Jute',               'జనుము / जूट / পাট',              'Kharif Commercial', 5050,'🌿', 'Kharif', ARRAY['West Bengal','Bihar','Assam','Odisha']),
  ('coconut',   'Coconut',            'కొబ్బరి / नारियल / ತೆಂಗಿನಕಾಯಿ',  'Fruit',            3275, '🥥', 'Annual', ARRAY['Kerala','Karnataka','Tamil Nadu','Andhra Pradesh']),
  ('chilli',    'Chilli',             'మిర్చి / मिर्च / ಮೆಣಸಿನಕಾಯಿ',    'Horticulture',        0, '🌶️','Kharif', ARRAY['Andhra Pradesh','Telangana','Karnataka','Maharashtra'])
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 6. REGISTRATIONS & TOKENS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.registrations (
    id                      TEXT PRIMARY KEY,
    farmer_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farmer_name             TEXT NOT NULL,
    phone                   TEXT NOT NULL,
    farmer_reg_id           TEXT,
    village                 TEXT,
    district                TEXT,
    crop                    TEXT NOT NULL,
    quantity_quintals       NUMERIC NOT NULL,
    vehicle_number          TEXT,
    centre_id               TEXT NOT NULL REFERENCES public.procurement_centres(id),
    centre_name             TEXT,
    preferred_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    preferred_time          TEXT DEFAULT '10:00 AM',
    token_number            INTEGER NOT NULL,
    queue_position          INTEGER NOT NULL DEFAULT 1,
    current_stage           procurement_stage_type NOT NULL DEFAULT 'GATE_ENTRY',
    procurement_status      procurement_status_type NOT NULL DEFAULT 'WAITING_FOR_GATE_ENTRY',
    estimated_processing_mins INTEGER DEFAULT 45,
    delay_minutes           INTEGER DEFAULT 0,
    bottleneck_remarks      TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_centre_date_token UNIQUE (centre_id, preferred_date, token_number)
);

-- 7. QUALITY CHECKS
CREATE TABLE IF NOT EXISTS public.quality_checks (
    id                  TEXT PRIMARY KEY,
    registration_id     TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    moisture_percentage NUMERIC,
    quality_result      TEXT,
    faq_compliant       BOOLEAN DEFAULT true,
    assayer_name        TEXT,
    assayer_remarks     TEXT,
    status              TEXT DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WEIGHING RECORDS
CREATE TABLE IF NOT EXISTS public.weighing_records (
    id                      TEXT PRIMARY KEY,
    registration_id         TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    gross_weight            NUMERIC,
    tare_weight             NUMERIC,
    net_weight              NUMERIC,
    weighbridge_slip_number TEXT,
    operator_name           TEXT,
    operator_remarks        TEXT,
    status                  TEXT DEFAULT 'PENDING',
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BAGGING RECORDS
CREATE TABLE IF NOT EXISTS public.bagging_records (
    id                      TEXT PRIMARY KEY,
    registration_id         TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    number_of_bags          INTEGER,
    gunny_bag_type          TEXT DEFAULT 'Standard 50kg Jute',
    labour_delay_reported   BOOLEAN DEFAULT false,
    delay_reason            TEXT,
    operator_remarks        TEXT,
    status                  TEXT DEFAULT 'PENDING',
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- 10. J-FORMS
CREATE TABLE IF NOT EXISTS public.j_forms (
    id                  TEXT PRIMARY KEY,
    registration_id     TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    j_form_number       TEXT UNIQUE NOT NULL,
    quantity_procured   NUMERIC NOT NULL,
    msp_rate            NUMERIC NOT NULL,
    total_amount        NUMERIC NOT NULL,
    issued_by           TEXT,
    issued_at           TIMESTAMPTZ DEFAULT NOW(),
    status              TEXT DEFAULT 'GENERATED'
);

-- 11. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id                  TEXT PRIMARY KEY,
    registration_id     TEXT NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
    farmer_id           UUID NOT NULL REFERENCES auth.users(id),
    amount              NUMERIC NOT NULL,
    msp_price           NUMERIC,
    quantity            NUMERIC,
    status              payment_status_type NOT NULL DEFAULT 'PENDING',
    transaction_id      TEXT,
    payment_date        TIMESTAMPTZ,
    bank_account_masked TEXT,
    ifsc_masked         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 12. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id          TEXT PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    channel     TEXT DEFAULT 'SMS',
    read        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id              TEXT PRIMARY KEY,
    registration_id TEXT REFERENCES public.registrations(id) ON DELETE SET NULL,
    stage           TEXT NOT NULL,
    previous_status TEXT,
    new_status      TEXT NOT NULL,
    updated_by      UUID REFERENCES auth.users(id),
    remarks         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_registrations_farmer ON public.registrations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_registrations_centre ON public.registrations(centre_id);
CREATE INDEX IF NOT EXISTS idx_registrations_date ON public.registrations(preferred_date);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations(procurement_status);
CREATE INDEX IF NOT EXISTS idx_payments_farmer ON public.payments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_centres_district ON public.procurement_centres(district);
CREATE INDEX IF NOT EXISTS idx_centres_state ON public.procurement_centres(state);

-- ==============================================================================
-- ROW LEVEL SECURITY — STRICT (auth.uid() based, not USING(true))
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

-- Drop existing open policies before recreating
DROP POLICY IF EXISTS "Public can view centres" ON public.procurement_centres;
DROP POLICY IF EXISTS "Public can view crops" ON public.crops;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Registrations select policy" ON public.registrations;
DROP POLICY IF EXISTS "Registrations insert policy" ON public.registrations;
DROP POLICY IF EXISTS "Registrations update policy" ON public.registrations;
DROP POLICY IF EXISTS "Quality checks select" ON public.quality_checks;
DROP POLICY IF EXISTS "Quality checks write" ON public.quality_checks;
DROP POLICY IF EXISTS "Weighing select" ON public.weighing_records;
DROP POLICY IF EXISTS "Weighing write" ON public.weighing_records;
DROP POLICY IF EXISTS "Bagging select" ON public.bagging_records;
DROP POLICY IF EXISTS "Bagging write" ON public.bagging_records;
DROP POLICY IF EXISTS "J-Forms select" ON public.j_forms;
DROP POLICY IF EXISTS "J-Forms write" ON public.j_forms;
DROP POLICY IF EXISTS "Payments select" ON public.payments;
DROP POLICY IF EXISTS "Payments write" ON public.payments;

-- ── Master data: authenticated read-only ──
CREATE POLICY "Authenticated can view centres" ON public.procurement_centres
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Authenticated can view crops" ON public.crops
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- ── Profiles: own data only ──
CREATE POLICY "profile_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profile_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profile_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── Registrations: farmer sees own, operators see centre's, govt sees all ──
CREATE POLICY "registration_farmer_select" ON public.registrations
  FOR SELECT USING (
    auth.uid() = farmer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government','support'))
  );
CREATE POLICY "registration_farmer_insert" ON public.registrations
  FOR INSERT WITH CHECK (auth.uid() = farmer_id);
CREATE POLICY "registration_operator_update" ON public.registrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government'))
  );

-- ── Quality/Weighing/Bagging: operator writes, farmer reads own ──
CREATE POLICY "quality_checks_select" ON public.quality_checks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.farmer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('operator','government','support'))))
  );
CREATE POLICY "quality_checks_operator_write" ON public.quality_checks
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government')));

CREATE POLICY "weighing_select" ON public.weighing_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.farmer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('operator','government','support'))))
  );
CREATE POLICY "weighing_operator_write" ON public.weighing_records
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government')));

CREATE POLICY "bagging_select" ON public.bagging_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.farmer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('operator','government','support'))))
  );
CREATE POLICY "bagging_operator_write" ON public.bagging_records
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government')));

-- ── J-Forms: farmer reads own, operator writes ──
CREATE POLICY "jforms_select" ON public.j_forms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.registrations r WHERE r.id = registration_id AND (r.farmer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('operator','government','support'))))
  );
CREATE POLICY "jforms_operator_write" ON public.j_forms
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government')));

-- ── Payments: farmer sees own, govt/support sees all ──
CREATE POLICY "payments_farmer_select" ON public.payments
  FOR SELECT USING (
    auth.uid() = farmer_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government','support'))
  );
CREATE POLICY "payments_operator_write" ON public.payments
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government')));

-- ── Notifications: user sees only their own ──
CREATE POLICY "notifications_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT WITH CHECK (true); -- System inserts; restrict with service role in production
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Audit Logs: operators write, govt reads all ──
CREATE POLICY "audit_logs_govt_select" ON public.audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government','support')));
CREATE POLICY "audit_logs_operator_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('operator','government')));

-- ==============================================================================
-- TOKEN GENERATOR FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_next_procurement_token(p_centre_id TEXT, p_date DATE)
RETURNS INTEGER AS $$
DECLARE v_max_token INTEGER;
BEGIN
    SELECT COALESCE(MAX(token_number), 0)
    INTO v_max_token
    FROM public.registrations
    WHERE centre_id = p_centre_id AND preferred_date = p_date;
    RETURN v_max_token + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- TRIGGER: auto-update `updated_at`
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_registrations_updated_at ON public.registrations;
CREATE TRIGGER trg_registrations_updated_at BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
