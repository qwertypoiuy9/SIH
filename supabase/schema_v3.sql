-- KisanFlow Schema v3 — Run this in Supabase SQL Editor (new query tab)

ALTER TABLE public.procurement_centres
  ADD COLUMN IF NOT EXISTS mandal  TEXT,
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

CREATE TABLE IF NOT EXISTS public.market_prices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_id        TEXT NOT NULL REFERENCES public.crops(id) ON DELETE CASCADE,
    crop_name      TEXT NOT NULL,
    variety        TEXT,
    market_name    TEXT NOT NULL,
    district       TEXT NOT NULL,
    state          TEXT NOT NULL DEFAULT 'Telangana',
    min_price      NUMERIC,
    max_price      NUMERIC,
    modal_price    NUMERIC NOT NULL,
    msp_price      NUMERIC,
    arrival_tonnes NUMERIC,
    price_date     DATE NOT NULL,
    source         TEXT DEFAULT 'Agmarknet',
    source_url     TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_crop ON public.market_prices(crop_id);
CREATE INDEX IF NOT EXISTS idx_mp_date ON public.market_prices(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_mp_dist ON public.market_prices(district);

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mp_public_read" ON public.market_prices;
CREATE POLICY "mp_public_read" ON public.market_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "mp_govt_write" ON public.market_prices;
CREATE POLICY "mp_govt_write" ON public.market_prices FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('government','operator')));

CREATE TABLE IF NOT EXISTS public.telangana_districts (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL UNIQUE,
    name_te   TEXT,
    hq        TEXT,
    latitude  DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS public.telangana_mandals (
    id       SERIAL PRIMARY KEY,
    district TEXT NOT NULL REFERENCES public.telangana_districts(name) ON DELETE CASCADE,
    name     TEXT NOT NULL,
    name_te  TEXT,
    UNIQUE (district, name)
);

CREATE TABLE IF NOT EXISTS public.telangana_villages (
    id        SERIAL PRIMARY KEY,
    district  TEXT NOT NULL,
    mandal    TEXT NOT NULL,
    name      TEXT NOT NULL,
    name_te   TEXT,
    pincode   TEXT,
    latitude  DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    FOREIGN KEY (district, mandal) REFERENCES public.telangana_mandals(district, name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ts_mandals_dist    ON public.telangana_mandals(district);
CREATE INDEX IF NOT EXISTS idx_ts_villages_dist   ON public.telangana_villages(district);
CREATE INDEX IF NOT EXISTS idx_ts_villages_mandal ON public.telangana_villages(mandal);
CREATE INDEX IF NOT EXISTS idx_ts_villages_pin    ON public.telangana_villages(pincode);

ALTER TABLE public.telangana_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telangana_mandals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telangana_villages  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ts_dist_read"    ON public.telangana_districts;
CREATE POLICY "ts_dist_read"    ON public.telangana_districts FOR SELECT USING (true);
DROP POLICY IF EXISTS "ts_mandal_read"  ON public.telangana_mandals;
CREATE POLICY "ts_mandal_read"  ON public.telangana_mandals   FOR SELECT USING (true);
DROP POLICY IF EXISTS "ts_village_read" ON public.telangana_villages;
CREATE POLICY "ts_village_read" ON public.telangana_villages  FOR SELECT USING (true);

INSERT INTO public.telangana_districts (name, name_te, hq, latitude, longitude) VALUES
  ('Adilabad',                'ఆదిలాబాద్',             'Adilabad',      19.6641, 78.5320),
  ('Bhadradri Kothagudem',    'భద్రాద్రి కొత్తగూడెం',   'Kothagudem',    17.5508, 80.6192),
  ('Hanamkonda',              'హనుమకొండ',              'Hanamkonda',    18.0011, 79.5706),
  ('Hyderabad',               'హైదరాబాద్',              'Hyderabad',     17.3850, 78.4867),
  ('Jagtial',                 'జగిత్యాల',               'Jagtial',       18.7950, 79.0000),
  ('Jangaon',                 'జనగామ',                 'Jangaon',       17.7252, 79.1523),
  ('Jayashankar Bhupalpally', 'జయశంకర్ భూపాలపల్లి',    'Bhupalpally',   18.4495, 80.4275),
  ('Jogulamba Gadwal',        'జోగులాంబ గద్వాల',        'Gadwal',        16.2330, 77.7946),
  ('Kamareddy',               'కామారెడ్డి',              'Kamareddy',     18.3220, 78.3390),
  ('Karimnagar',              'కరీంనగర్',               'Karimnagar',    18.4386, 79.1288),
  ('Khammam',                 'ఖమ్మం',                  'Khammam',       17.2473, 80.1514),
  ('Komaram Bheem Asifabad',  'కొమురం భీం ఆసిఫాబాద్',   'Asifabad',      19.3720, 79.2780),
  ('Mahabubabad',             'మహబూబాబాద్',             'Mahabubabad',   17.6000, 80.0000),
  ('Mahabubnagar',            'మహబూబ్‌నగర్',             'Mahabubnagar',  16.7370, 77.9830),
  ('Mancherial',              'మంచిర్యాల',               'Mancherial',    18.8687, 79.4566),
  ('Medak',                   'మెదక్',                  'Medak',         18.0487, 78.2614),
  ('Medchal-Malkajgiri',      'మేడ్చల్-మల్కాజిగిరి',     'Medchal',       17.6328, 78.4797),
  ('Mulugu',                  'ములుగు',                 'Mulugu',        18.1927, 80.0780),
  ('Nagarkurnool',            'నాగర్‌కర్నూల్',            'Nagarkurnool',  16.4822, 78.3260),
  ('Nalgonda',                'నల్గొండ',                'Nalgonda',      17.0575, 79.2672),
  ('Narayanpet',              'నారాయణపేట',              'Narayanpet',    16.7440, 77.4960),
  ('Nirmal',                  'నిర్మల్',                 'Nirmal',        19.0940, 78.3440),
  ('Nizamabad',               'నిజామాబాద్',              'Nizamabad',     18.6725, 78.0941),
  ('Peddapalli',              'పెద్దపల్లి',               'Peddapalli',    18.6151, 79.3736),
  ('Rajanna Sircilla',        'రాజన్న సిరిసిల్ల',         'Sircilla',      18.3849, 78.8271),
  ('Ranga Reddy',             'రంగారెడ్డి',               'Hyderabad',     17.3500, 78.4200),
  ('Sangareddy',              'సంగారెడ్డి',               'Sangareddy',    17.6243, 78.0862),
  ('Siddipet',                'సిద్దిపేట',                'Siddipet',      18.1016, 78.8521),
  ('Suryapet',                'సూర్యాపేట',                'Suryapet',      17.1400, 79.6220),
  ('Vikarabad',               'వికారాబాద్',               'Vikarabad',     17.3363, 77.9035),
  ('Wanaparthy',              'వనపర్తి',                 'Wanaparthy',    16.3596, 78.0643),
  ('Warangal',                'వరంగల్',                 'Warangal',      18.0011, 79.5771),
  ('Yadadri Bhuvanagiri',     'యాదాద్రి భువనగిరి',        'Bhongir',       17.5070, 78.8880)
ON CONFLICT (name) DO NOTHING;

DELETE FROM public.procurement_centres WHERE state NOT IN ('Telangana');

INSERT INTO public.procurement_centres
  (id, name, address, district, state, mandal, village, pincode,
   latitude, longitude, capacity_per_day, active_counters,
   open_hours, status, accepted_crops, avg_processing_mins, contact)
VALUES
  ('ctr_wgl_lakshmipur','Lakshmipur Government Procurement Centre','Lakshmipur Village, Warangal Rural','Warangal','Telangana','Warangal Rural','Lakshmipur','506101',17.9784,79.5941,150,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],45,'08712-233456'),
  ('ctr_wgl_ramapuram','Ramapuram APMC Procurement Centre','Ramapuram, Warangal Urban','Warangal','Telangana','Warangal Urban','Ramapuram','506002',18.0023,79.5702,180,4,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Soybean'],40,'08712-244567'),
  ('ctr_wgl_kothuru','Kothuru Primary Processing Centre','Kothuru Mandal, Warangal','Warangal','Telangana','Kothuru','Kothuru','506330',17.9345,79.6112,120,2,'09:00 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08712-255678'),
  ('ctr_hnk_hanamkonda','Hanamkonda APMC Market Yard','APMC Market Yard, Hanamkonda','Hanamkonda','Telangana','Hanamkonda','Hanamkonda','506001',18.0011,79.5706,200,5,'07:30 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton','Jowar'],38,'0870-2570123'),
  ('ctr_kmr_karimnagar','Karimnagar APMC Procurement Centre','APMC Yard, Karimnagar','Karimnagar','Telangana','Karimnagar','Karimnagar','505001',18.4386,79.1288,175,4,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Maize','Jowar'],42,'0878-2240123'),
  ('ctr_kmr_huzurabad','Huzurabad Procurement Centre','Huzurabad Market Yard','Karimnagar','Telangana','Huzurabad','Huzurabad','505468',18.1964,79.4061,120,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],45,'08726-255200'),
  ('ctr_khm_khammam','Khammam APMC Market Yard','APMC Yard, Khammam','Khammam','Telangana','Khammam','Khammam','507001',17.2473,80.1514,180,4,'07:30 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Maize'],40,'08742-224411'),
  ('ctr_khm_wyra','Wyra Procurement Centre','Wyra Market, Khammam','Khammam','Telangana','Wyra','Wyra','507165',17.3408,80.3601,100,2,'08:00 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08742-256300'),
  ('ctr_nlg_nalgonda','Nalgonda APMC Procurement Centre','APMC Yard, Nalgonda','Nalgonda','Telangana','Nalgonda','Nalgonda','508001',17.0575,79.2672,160,4,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Maize'],42,'08682-223456'),
  ('ctr_nlg_miryalaguda','Miryalaguda Procurement Centre','Market Yard, Miryalaguda','Nalgonda','Telangana','Miryalaguda','Miryalaguda','508207',16.8700,79.5600,140,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],44,'08683-222445'),
  ('ctr_mbn_mahabubnagar','Mahabubnagar APMC Market Yard','APMC Yard, Mahabubnagar','Mahabubnagar','Telangana','Mahabubnagar','Mahabubnagar','509001',16.7370,77.9830,150,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Jowar','Maize'],45,'08542-225111'),
  ('ctr_nzb_nizamabad','Nizamabad APMC Procurement Centre','APMC Market, Nizamabad','Nizamabad','Telangana','Nizamabad','Nizamabad','503001',18.6725,78.0941,170,4,'07:30 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar','Soybean'],40,'08462-224666'),
  ('ctr_nzb_bodhan','Bodhan Paddy Procurement Centre','Bodhan Market, Nizamabad','Nizamabad','Telangana','Bodhan','Bodhan','503185',18.6607,77.9008,120,3,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],48,'08463-222300'),
  ('ctr_adl_adilabad','Adilabad APMC Market Yard','APMC Yard, Adilabad','Adilabad','Telangana','Adilabad','Adilabad','504001',19.6641,78.5320,130,3,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Soybean','Cotton','Maize'],48,'08732-228500'),
  ('ctr_mcl_mancherial','Mancherial Procurement Centre','Market Yard, Mancherial','Mancherial','Telangana','Mancherial','Mancherial','504208',18.8687,79.4566,120,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],46,'08734-222100'),
  ('ctr_bkg_kothagudem','Kothagudem APMC Procurement Centre','APMC Yard, Kothagudem','Bhadradri Kothagudem','Telangana','Kothagudem','Kothagudem','507101',17.5508,80.6192,140,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],44,'08744-240200'),
  ('ctr_jbp_bhupalpally','Bhupalpally Procurement Centre','Market Yard, Bhupalpally','Jayashankar Bhupalpally','Telangana','Bhupalpally','Bhupalpally','506169',18.4495,80.4275,100,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08713-225600'),
  ('ctr_pdp_ramagundam','Ramagundam Procurement Centre','Market Yard, Ramagundam','Peddapalli','Telangana','Ramagundam','Ramagundam','505208',18.7616,79.4976,130,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],44,'08728-221200'),
  ('ctr_jng_jangaon','Jangaon APMC Procurement Centre','APMC Yard, Jangaon','Jangaon','Telangana','Jangaon','Jangaon','506167',17.7252,79.1523,110,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],46,'08711-222500'),
  ('ctr_mdk_medak','Medak APMC Procurement Centre','APMC Yard, Medak','Medak','Telangana','Medak','Medak','502110',18.0487,78.2614,120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton'],45,'08452-222300'),
  ('ctr_sgr_sangareddy','Sangareddy Procurement Centre','Market Yard, Sangareddy','Sangareddy','Telangana','Sangareddy','Sangareddy','502001',17.6243,78.0862,130,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton','Sunflower'],44,'08455-223100'),
  ('ctr_sdp_siddipet','Siddipet APMC Procurement Centre','APMC Yard, Siddipet','Siddipet','Telangana','Siddipet','Siddipet','502103',18.1016,78.8521,120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Jowar'],46,'08457-222400'),
  ('ctr_sry_suryapet','Suryapet APMC Procurement Centre','APMC Yard, Suryapet','Suryapet','Telangana','Suryapet','Suryapet','508213',17.1400,79.6220,140,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton'],44,'08685-222600'),
  ('ctr_ydb_bhongir','Bhongir Procurement Centre','Market Yard, Bhongir','Yadadri Bhuvanagiri','Telangana','Bhongir','Bhongir','508116',17.5070,78.8880,110,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],47,'08687-222100'),
  ('ctr_vkb_vikarabad','Vikarabad Procurement Centre','Market Yard, Vikarabad','Vikarabad','Telangana','Vikarabad','Vikarabad','501101',17.3363,77.9035,100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Groundnut','Jowar'],50,'08411-222200'),
  ('ctr_wpy_wanaparthy','Wanaparthy APMC Centre','Market Yard, Wanaparthy','Wanaparthy','Telangana','Wanaparthy','Wanaparthy','509103',16.3596,78.0643,100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Groundnut','Jowar'],50,'08543-222600'),
  ('ctr_jlg_gadwal','Gadwal Procurement Centre','Market Yard, Gadwal','Jogulamba Gadwal','Telangana','Gadwal','Gadwal','509125',16.2330,77.7946,100,2,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Cotton','Groundnut'],50,'08544-222100'),
  ('ctr_nkl_nagarkurnool','Nagarkurnool Procurement Centre','Market Yard, Nagarkurnool','Nagarkurnool','Telangana','Nagarkurnool','Nagarkurnool','509209',16.4822,78.3260,110,3,'08:00 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Cotton','Jowar'],47,'08542-242200'),
  ('ctr_nrp_narayanpet','Narayanpet APMC Centre','Market Yard, Narayanpet','Narayanpet','Telangana','Narayanpet','Narayanpet','509210',16.7440,77.4960,90,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Cotton','Groundnut'],52,'08543-244100'),
  ('ctr_krd_kamareddy','Kamareddy Procurement Centre','Market Yard, Kamareddy','Kamareddy','Telangana','Kamareddy','Kamareddy','503111',18.3220,78.3390,120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Soybean'],45,'08468-222100'),
  ('ctr_rjs_sircilla','Sircilla Procurement Centre','Market Yard, Sircilla','Rajanna Sircilla','Telangana','Sircilla','Sircilla','505301',18.3849,78.8271,110,3,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],47,'08720-222800'),
  ('ctr_jgt_jagtial','Jagtial APMC Procurement Centre','Market Yard, Jagtial','Jagtial','Telangana','Jagtial','Jagtial','505327',18.7950,79.0000,120,3,'08:00 AM - 06:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Cotton'],45,'08724-222500'),
  ('ctr_nml_nirmal','Nirmal APMC Centre','Market Yard, Nirmal','Nirmal','Telangana','Nirmal','Nirmal','504106',19.0940,78.3440,100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Soybean','Cotton','Maize'],50,'08734-232600'),
  ('ctr_kba_asifabad','Asifabad Procurement Centre','Market Yard, Asifabad','Komaram Bheem Asifabad','Telangana','Asifabad','Asifabad','504293',19.3720,79.2780,80,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize','Soybean'],55,'08741-222300'),
  ('ctr_mhd_mahabubabad','Mahabubabad Procurement Centre','Market Yard, Mahabubabad','Mahabubabad','Telangana','Mahabubabad','Mahabubabad','506101',17.6000,80.0000,100,2,'08:30 AM - 05:30 PM','OPTIMAL',ARRAY['Paddy','Maize'],50,'08713-222700'),
  ('ctr_mlg_mulugu','Mulugu Procurement Centre','Market Yard, Mulugu','Mulugu','Telangana','Mulugu','Mulugu','506343',18.1927,80.0780,80,2,'08:30 AM - 05:00 PM','OPTIMAL',ARRAY['Paddy','Maize'],55,'08715-222200')
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, address=EXCLUDED.address, mandal=EXCLUDED.mandal,
  village=EXCLUDED.village, pincode=EXCLUDED.pincode,
  latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
  capacity_per_day=EXCLUDED.capacity_per_day, active_counters=EXCLUDED.active_counters,
  open_hours=EXCLUDED.open_hours, accepted_crops=EXCLUDED.accepted_crops,
  contact=EXCLUDED.contact, updated_at=NOW();
