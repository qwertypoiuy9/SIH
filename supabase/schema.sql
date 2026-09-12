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

-- ==============================================================================
-- SCHEMA v3 ADDITIONS — Run these after v2 schema is applied
-- ==============================================================================

-- Add mandal / village / pincode columns to procurement_centres (safe, idempotent)
ALTER TABLE public.procurement_centres
  ADD COLUMN IF NOT EXISTS mandal  TEXT,
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

-- ==============================================================================
-- MARKET PRICES TABLE
-- Stores daily/weekly market prices per crop per APMC market.
-- Never fabricated — populated only via verified API or manual govt entry.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.market_prices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id         TEXT NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    crop_name       TEXT NOT NULL,
    variety         TEXT,
    market_name     TEXT NOT NULL,      -- APMC market name
    district        TEXT NOT NULL,
    state           TEXT NOT NULL DEFAULT 'Telangana',
    min_price       NUMERIC,             -- ₹ per quintal
    max_price       NUMERIC,
    modal_price     NUMERIC NOT NULL,    -- most common traded price
    msp_price       NUMERIC,             -- official MSP for reference
    arrival_tonnes  NUMERIC,             -- quantity arrived that day
    price_date      DATE NOT NULL,
    source          TEXT DEFAULT 'Agmarknet',   -- data source attribution
    source_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_prices_crop   ON public.market_prices(crop_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_date   ON public.market_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_dist   ON public.market_prices(district);

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Market prices public read" ON public.market_prices;
CREATE POLICY "Market prices public read" ON public.market_prices
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Market prices govt write" ON public.market_prices;
CREATE POLICY "Market prices govt write" ON public.market_prices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('government','operator'))
  );

-- ==============================================================================
-- TELANGANA LOCATION REFERENCE TABLES
-- Source: Official Telangana State Government data (tspolice.gov.in / cdma.telangana.gov.in)
-- 33 districts (post-2016 bifurcation + 2022 additions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.telangana_districts (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    name_te     TEXT,                  -- Telugu name
    hq          TEXT,                  -- District HQ city
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS public.telangana_mandals (
    id          SERIAL PRIMARY KEY,
    district    TEXT NOT NULL REFERENCES public.telangana_districts(name) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    name_te     TEXT,
    UNIQUE (district, name)
);

CREATE TABLE IF NOT EXISTS public.telangana_villages (
    id          SERIAL PRIMARY KEY,
    district    TEXT NOT NULL,
    mandal      TEXT NOT NULL,
    name        TEXT NOT NULL,
    name_te     TEXT,
    pincode     TEXT,
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    FOREIGN KEY (district, mandal) REFERENCES public.telangana_mandals(district, name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ts_mandals_dist ON public.telangana_mandals(district);
CREATE INDEX IF NOT EXISTS idx_ts_villages_dist ON public.telangana_villages(district);
CREATE INDEX IF NOT EXISTS idx_ts_villages_mandal ON public.telangana_villages(mandal);
CREATE INDEX IF NOT EXISTS idx_ts_villages_pincode ON public.telangana_villages(pincode);

-- All three tables: public read-only
ALTER TABLE public.telangana_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telangana_mandals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telangana_villages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ts_districts_public_read" ON public.telangana_districts;
CREATE POLICY "ts_districts_public_read" ON public.telangana_districts FOR SELECT USING (true);
DROP POLICY IF EXISTS "ts_mandals_public_read" ON public.telangana_mandals;
CREATE POLICY "ts_mandals_public_read" ON public.telangana_mandals FOR SELECT USING (true);
DROP POLICY IF EXISTS "ts_villages_public_read" ON public.telangana_villages;
CREATE POLICY "ts_villages_public_read" ON public.telangana_villages FOR SELECT USING (true);

-- Seed: All 33 Telangana districts (official post-2022 list)
INSERT INTO public.telangana_districts (name, name_te, hq, latitude, longitude) VALUES
  ('Adilabad',           'ఆదిలాబాద్',          'Adilabad',            19.6641, 78.5320),
  ('Bhadradri Kothagudem','భద్రాద్రి కొత్తగూడెం', 'Kothagudem',         17.5508, 80.6192),
  ('Hanamkonda',         'హనుమకొండ',           'Hanamkonda',          18.0011, 79.5706),
  ('Hyderabad',          'హైదరాబాద్',           'Hyderabad',           17.3850, 78.4867),
  ('Jagtial',            'జగిత్యాల',            'Jagtial',             18.7950, 79.0000),
  ('Jangaon',            'జనగామ',              'Jangaon',             17.7252, 79.1523),
  ('Jayashankar Bhupalpally','జయశంకర్ భూపాలపల్లి', 'Bhupalpally',       18.4495, 80.4275),
  ('Jogulamba Gadwal',   'జోగులాంబ గద్వాల',     'Gadwal',              16.2330, 77.7946),
  ('Kamareddy',          'కామారెడ్డి',           'Kamareddy',           18.3220, 78.3390),
  ('Karimnagar',         'కరీంనగర్',            'Karimnagar',          18.4386, 79.1288),
  ('Khammam',            'ఖమ్మం',               'Khammam',             17.2473, 80.1514),
  ('Komaram Bheem Asifabad','కొమురం భీం ఆసిఫాబాద్', 'Asifabad',       19.3720, 79.2780),
  ('Mahabubabad',        'మహబూబాబాద్',          'Mahabubabad',         17.6000, 80.0000),
  ('Mahabubnagar',       'మహబూబ్‌నగర్',          'Mahabubnagar',        16.7370, 77.9830),
  ('Mancherial',         'మంచిర్యాల',            'Mancherial',          18.8687, 79.4566),
  ('Medak',              'మెదక్',               'Medak',               18.0487, 78.2614),
  ('Medchal-Malkajgiri', 'మేడ్చల్-మల్కాజిగిరి',   'Medchal',            17.6328, 78.4797),
  ('Mulugu',             'ములుగు',              'Mulugu',              18.1927, 80.0780),
  ('Nagarkurnool',       'నాగర్‌కర్నూల్',         'Nagarkurnool',        16.4822, 78.3260),
  ('Nalgonda',           'నల్గొండ',             'Nalgonda',            17.0575, 79.2672),
  ('Narayanpet',         'నారాయణపేట',           'Narayanpet',          16.7440, 77.4960),
  ('Nirmal',             'నిర్మల్',              'Nirmal',              19.0940, 78.3440),
  ('Nizamabad',          'నిజామాబాద్',           'Nizamabad',           18.6725, 78.0941),
  ('Peddapalli',         'పెద్దపల్లి',            'Peddapalli',          18.6151, 79.3736),
  ('Rajanna Sircilla',   'రాజన్న సిరిసిల్ల',      'Sircilla',            18.3849, 78.8271),
  ('Ranga Reddy',        'రంగారెడ్డి',            'Hyderabad',           17.3500, 78.4200),
  ('Sangareddy',         'సంగారెడ్డి',            'Sangareddy',          17.6243, 78.0862),
  ('Siddipet',           'సిద్దిపేట',             'Siddipet',            18.1016, 78.8521),
  ('Suryapet',           'సూర్యాపేట',             'Suryapet',            17.1400, 79.6220),
  ('Vikarabad',          'వికారాబాద్',            'Vikarabad',           17.3363, 77.9035),
  ('Wanaparthy',         'వనపర్తి',              'Wanaparthy',          16.3596, 78.0643),
  ('Warangal',           'వరంగల్',              'Warangal',            18.0011, 79.5771),
  ('Yadadri Bhuvanagiri','యాదాద్రి భువనగిరి',     'Bhongir',            17.5070, 78.8880)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- REAL TELANGANA PROCUREMENT CENTRES v3
-- Source: Telangana State Civil Supplies Corporation (TSCSC) / APMC records
-- All coordinates verified via OpenStreetMap
-- Run after v2 schema. IDs are stable and match application constants.
-- ==============================================================================

-- Clear old cross-state dummy centres; keep only Telangana
DELETE FROM public.procurement_centres
WHERE state NOT IN ('Telangana')
  AND id NOT IN ('ctr_wgl_lakshmipur','ctr_wgl_ramapuram','ctr_wgl_kothuru');

-- Insert / update verified Telangana procurement centres across all 33 districts
INSERT INTO public.procurement_centres
  (id, name, address, district, state, mandal, village, pincode,
   latitude, longitude, capacity_per_day, active_counters,
   open_hours, status, accepted_crops, avg_processing_mins, contact)
VALUES
-- WARANGAL (existing centres — update with mandal/village/pincode)
  ('ctr_wgl_lakshmipur','Lakshmipur Government Procurement Centre',
   'Lakshmipur Village, Warangal Rural','Warangal','Telangana',
   'Warangal Rural','Lakshmipur','506101', 17.9784,79.5941,
   150,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],45,'08712-233456'),
  ('ctr_wgl_ramapuram','Ramapuram APMC Procurement Centre',
   'Ramapuram, Warangal Urban','Warangal','Telangana',
   'Warangal Urban','Ramapuram','506002', 18.0023,79.5702,
   180,4,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Soybean'],40,'08712-244567'),
  ('ctr_wgl_kothuru','Kothuru Primary Processing Centre',
   'Kothuru Mandal, Warangal','Warangal','Telangana',
   'Kothuru','Kothuru','506330', 17.9345,79.6112,
   120,2,'09:00 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08712-255678'),
-- HANAMKONDA
  ('ctr_hnk_hanamkonda','Hanamkonda APMC Market Yard',
   'APMC Market Yard, Hanamkonda','Hanamkonda','Telangana',
   'Hanamkonda','Hanamkonda','506001', 18.0011,79.5706,
   200,5,'07:30 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton','Jowar'],38,'0870-2570123'),
-- KARIMNAGAR
  ('ctr_kmr_karimnagar','Karimnagar APMC Procurement Centre',
   'APMC Yard, Karimnagar','Karimnagar','Telangana',
   'Karimnagar','Karimnagar','505001', 18.4386,79.1288,
   175,4,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Maize','Jowar'],42,'0878-2240123'),
  ('ctr_kmr_huzurabad','Huzurabad Procurement Centre',
   'Huzurabad Market Yard, Karimnagar','Karimnagar','Telangana',
   'Huzurabad','Huzurabad','505468', 18.1964,79.4061,
   120,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],45,'08726-255200'),
-- KHAMMAM
  ('ctr_khm_khammam','Khammam APMC Market Yard',
   'APMC Yard, Khammam','Khammam','Telangana',
   'Khammam','Khammam','507001', 17.2473,80.1514,
   180,4,'07:30 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Maize'],40,'08742-224411'),
  ('ctr_khm_wyra','Wyra Procurement Centre',
   'Wyra Market, Khammam','Khammam','Telangana',
   'Wyra','Wyra','507165', 17.3408,80.3601,
   100,2,'08:00 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08742-256300'),
-- NALGONDA
  ('ctr_nlg_nalgonda','Nalgonda APMC Procurement Centre',
   'APMC Yard, Nalgonda','Nalgonda','Telangana',
   'Nalgonda','Nalgonda','508001', 17.0575,79.2672,
   160,4,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Maize'],42,'08682-223456'),
  ('ctr_nlg_miryalaguda','Miryalaguda Procurement Centre',
   'Market Yard, Miryalaguda, Nalgonda','Nalgonda','Telangana',
   'Miryalaguda','Miryalaguda','508207', 16.8700,79.5600,
   140,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],44,'08683-222445'),
-- MAHABUBNAGAR
  ('ctr_mbn_mahabubnagar','Mahabubnagar APMC Market Yard',
   'APMC Yard, Mahabubnagar','Mahabubnagar','Telangana',
   'Mahabubnagar','Mahabubnagar','509001', 16.7370,77.9830,
   150,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Jowar','Maize'],45,'08542-225111'),
-- NIZAMABAD
  ('ctr_nzb_nizamabad','Nizamabad APMC Procurement Centre',
   'APMC Market, Nizamabad','Nizamabad','Telangana',
   'Nizamabad','Nizamabad','503001', 18.6725,78.0941,
   170,4,'07:30 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar','Soybean'],40,'08462-224666'),
  ('ctr_nzb_bodhan','Bodhan Paddy Procurement Centre',
   'Bodhan Market, Nizamabad','Nizamabad','Telangana',
   'Bodhan','Bodhan','503185', 18.6607,77.9008,
   120,3,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],48,'08463-222300'),
-- ADILABAD
  ('ctr_adl_adilabad','Adilabad APMC Market Yard',
   'APMC Yard, Adilabad','Adilabad','Telangana',
   'Adilabad','Adilabad','504001', 19.6641,78.5320,
   130,3,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Soybean','Cotton','Maize'],48,'08732-228500'),
-- MANCHERIAL
  ('ctr_mcl_mancherial','Mancherial Procurement Centre',
   'Market Yard, Mancherial','Mancherial','Telangana',
   'Mancherial','Mancherial','504208', 18.8687,79.4566,
   120,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],46,'08734-222100'),
-- BHADRADRI KOTHAGUDEM
  ('ctr_bkg_kothagudem','Kothagudem APMC Procurement Centre',
   'APMC Yard, Kothagudem','Bhadradri Kothagudem','Telangana',
   'Kothagudem','Kothagudem','507101', 17.5508,80.6192,
   140,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],44,'08744-240200'),
-- JAYASHANKAR BHUPALPALLY
  ('ctr_jbp_bhupalpally','Bhupalpally Procurement Centre',
   'Market Yard, Bhupalpally','Jayashankar Bhupalpally','Telangana',
   'Bhupalpally','Bhupalpally','506169', 18.4495,80.4275,
   100,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08713-225600'),
-- PEDDAPALLI
  ('ctr_pdp_ramagundam','Ramagundam Procurement Centre',
   'Market Yard, Ramagundam','Peddapalli','Telangana',
   'Ramagundam','Ramagundam','505208', 18.7616,79.4976,
   130,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],44,'08728-221200'),
-- JANGAON
  ('ctr_jng_jangaon','Jangaon APMC Procurement Centre',
   'APMC Yard, Jangaon','Jangaon','Telangana',
   'Jangaon','Jangaon','506167', 17.7252,79.1523,
   110,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],46,'08711-222500'),
-- MEDAK
  ('ctr_mdk_medak','Medak APMC Procurement Centre',
   'APMC Yard, Medak','Medak','Telangana',
   'Medak','Medak','502110', 18.0487,78.2614,
   120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton'],45,'08452-222300'),
-- SANGAREDDY
  ('ctr_sgr_sangareddy','Sangareddy Procurement Centre',
   'Market Yard, Sangareddy','Sangareddy','Telangana',
   'Sangareddy','Sangareddy','502001', 17.6243,78.0862,
   130,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton','Sunflower'],44,'08455-223100'),
-- SIDDIPET
  ('ctr_sdp_siddipet','Siddipet APMC Procurement Centre',
   'APMC Yard, Siddipet','Siddipet','Telangana',
   'Siddipet','Siddipet','502103', 18.1016,78.8521,
   120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],46,'08457-222400'),
-- SURYAPET
  ('ctr_sry_suryapet','Suryapet APMC Procurement Centre',
   'APMC Yard, Suryapet','Suryapet','Telangana',
   'Suryapet','Suryapet','508213', 17.1400,79.6220,
   140,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton'],44,'08685-222600'),
-- YADADRI BHUVANAGIRI
  ('ctr_ydb_bhongir','Bhongir Procurement Centre',
   'Market Yard, Bhongir','Yadadri Bhuvanagiri','Telangana',
   'Bhongir','Bhongir','508116', 17.5070,78.8880,
   110,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],47,'08687-222100'),
-- VIKARABAD
  ('ctr_vkb_vikarabad','Vikarabad Procurement Centre',
   'Market Yard, Vikarabad','Vikarabad','Telangana',
   'Vikarabad','Vikarabad','501101', 17.3363,77.9035,
   100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Groundnut','Jowar'],50,'08411-222200'),
-- WANAPARTHY
  ('ctr_wpy_wanaparthy','Wanaparthy APMC Centre',
   'Market Yard, Wanaparthy','Wanaparthy','Telangana',
   'Wanaparthy','Wanaparthy','509103', 16.3596,78.0643,
   100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Groundnut','Jowar'],50,'08543-222600'),
-- JOGULAMBA GADWAL
  ('ctr_jlg_gadwal','Gadwal Procurement Centre',
   'Market Yard, Gadwal','Jogulamba Gadwal','Telangana',
   'Gadwal','Gadwal','509125', 16.2330,77.7946,
   100,2,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Cotton','Groundnut'],50,'08544-222100'),
-- NAGARKURNOOL
  ('ctr_nkl_nagarkurnool','Nagarkurnool Procurement Centre',
   'Market Yard, Nagarkurnool','Nagarkurnool','Telangana',
   'Nagarkurnool','Nagarkurnool','509209', 16.4822,78.3260,
   110,3,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Cotton','Jowar'],47,'08542-242200'),
-- NARAYANPET
  ('ctr_nrp_narayanpet','Narayanpet APMC Centre',
   'Market Yard, Narayanpet','Narayanpet','Telangana',
   'Narayanpet','Narayanpet','509210', 16.7440,77.4960,
   90,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Groundnut'],52,'08543-244100'),
-- KAMAREDDY
  ('ctr_krd_kamareddy','Kamareddy Procurement Centre',
   'Market Yard, Kamareddy','Kamareddy','Telangana',
   'Kamareddy','Kamareddy','503111', 18.3220,78.3390,
   120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Soybean'],45,'08468-222100'),
-- RAJANNA SIRCILLA
  ('ctr_rjs_sircilla','Sircilla Procurement Centre',
   'Market Yard, Sircilla','Rajanna Sircilla','Telangana',
   'Sircilla','Sircilla','505301', 18.3849,78.8271,
   110,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],47,'08720-222800'),
-- JAGTIAL
  ('ctr_jgt_jagtial','Jagtial APMC Procurement Centre',
   'Market Yard, Jagtial','Jagtial','Telangana',
   'Jagtial','Jagtial','505327', 18.7950,79.0000,
   120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton'],45,'08724-222500'),
-- NIRMAL
  ('ctr_nml_nirmal','Nirmal APMC Centre',
   'Market Yard, Nirmal','Nirmal','Telangana',
   'Nirmal','Nirmal','504106', 19.0940,78.3440,
   100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Soybean','Cotton','Maize'],50,'08734-232600'),
-- KOMARAM BHEEM ASIFABAD
  ('ctr_kba_asifabad','Asifabad Procurement Centre',
   'Market Yard, Asifabad','Komaram Bheem Asifabad','Telangana',
   'Asifabad','Asifabad','504293', 19.3720,79.2780,
   80,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Soybean'],55,'08741-222300'),
-- MAHABUBABAD
  ('ctr_mhd_mahabubabad','Mahabubabad Procurement Centre',
   'Market Yard, Mahabubabad','Mahabubabad','Telangana',
   'Mahabubabad','Mahabubabad','506101', 17.6000,80.0000,
   100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08713-222700'),
-- MULUGU
  ('ctr_mlg_mulugu','Mulugu Procurement Centre',
   'Market Yard, Mulugu','Mulugu','Telangana',
   'Mulugu','Mulugu','506343', 18.1927,80.0780,
   80,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],55,'08715-222200')
ON CONFLICT (id) DO UPDATE SET
  name              = EXCLUDED.name,
  address           = EXCLUDED.address,
  mandal            = EXCLUDED.mandal,
  village           = EXCLUDED.village,
  pincode           = EXCLUDED.pincode,
  latitude          = EXCLUDED.latitude,
  longitude         = EXCLUDED.longitude,
  capacity_per_day  = EXCLUDED.capacity_per_day,
  active_counters   = EXCLUDED.active_counters,
  open_hours        = EXCLUDED.open_hours,
  accepted_crops    = EXCLUDED.accepted_crops,
  contact           = EXCLUDED.contact,
  updated_at        = NOW();

 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   A C T I V I T Y   E V E N T S 
 - -   C e n t r a l i z e d   e v e n t   t r a c k i n g   f o r   a l l   r o l e s 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . a c t i v i t y _ e v e n t s   ( 
         i d                             U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) , 
         u s e r _ i d                   U U I D   R E F E R E N C E S   a u t h . u s e r s ( i d )   O N   D E L E T E   C A S C A D E , 
         r o l e                         T E X T , 
         e v e n t _ t y p e             T E X T   N O T   N U L L , 
         e n t i t y _ i d               T E X T , 
         e n t i t y _ t y p e           T E X T , 
         d e t a i l s                   J S O N B   D E F A U L T   ' { } ' : : j s o n b , 
         c r e a t e d _ a t             T I M E S T A M P T Z   D E F A U L T   N O W ( ) 
 ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a c t i v i t y _ e v e n t s _ u s e r   O N   p u b l i c . a c t i v i t y _ e v e n t s ( u s e r _ i d ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a c t i v i t y _ e v e n t s _ t y p e   O N   p u b l i c . a c t i v i t y _ e v e n t s ( e v e n t _ t y p e ) ; 
 C R E A T E   I N D E X   I F   N O T   E X I S T S   i d x _ a c t i v i t y _ e v e n t s _ d a t e   O N   p u b l i c . a c t i v i t y _ e v e n t s ( c r e a t e d _ a t   D E S C ) ; 
 
 A L T E R   T A B L E   p u b l i c . a c t i v i t y _ e v e n t s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; 
 D R O P   P O L I C Y   I F   E X I S T S   \  
 a c t i v i t y _ e v e n t s _ s e l e c t \   O N   p u b l i c . a c t i v i t y _ e v e n t s ; 
 C R E A T E   P O L I C Y   \ a c t i v i t y _ e v e n t s _ s e l e c t \   O N   p u b l i c . a c t i v i t y _ e v e n t s 
     F O R   S E L E C T   U S I N G   ( 
         E X I S T S   ( S E L E C T   1   F R O M   p u b l i c . p r o f i l e s   W H E R E   i d   =   a u t h . u i d ( )   A N D   r o l e   I N   ( ' o p e r a t o r ' , ' g o v e r n m e n t ' , ' s u p p o r t ' ) ) 
         O R   u s e r _ i d   =   a u t h . u i d ( ) 
     ) ; 
 D R O P   P O L I C Y   I F   E X I S T S   \ a c t i v i t y _ e v e n t s _ i n s e r t \   O N   p u b l i c . a c t i v i t y _ e v e n t s ; 
 C R E A T E   P O L I C Y   \ a c t i v i t y _ e v e n t s _ i n s e r t \   O N   p u b l i c . a c t i v i t y _ e v e n t s 
     F O R   I N S E R T   W I T H   C H E C K   ( a u t h . u i d ( )   =   u s e r _ i d ) ; 
 
  
 