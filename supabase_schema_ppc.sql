-- ============================================================================
-- KisanQ — PPC Slot & Capacity Management Schema
-- Run this in Supabase SQL Editor AFTER the existing schema.sql
-- ============================================================================

-- 1. PPC Configuration (per-centre operating schedule + capacity)
CREATE TABLE IF NOT EXISTS ppc_config (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL REFERENCES procurement_centres(id) ON DELETE CASCADE,
  opening_time TEXT NOT NULL DEFAULT '08:00',
  closing_time TEXT NOT NULL DEFAULT '17:00',
  break_start TEXT DEFAULT '13:00',
  break_end TEXT DEFAULT '14:00',
  working_days INTEGER[] DEFAULT '{1,2,3,4,5,6}',
  num_workers INTEGER NOT NULL DEFAULT 8,
  num_weighing_machines INTEGER NOT NULL DEFAULT 2,
  num_counters INTEGER NOT NULL DEFAULT 3,
  capacity_qtl_per_hour NUMERIC(10,2) NOT NULL DEFAULT 80.0,
  slot_duration_mins INTEGER NOT NULL DEFAULT 30,
  buffer_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.0,
  max_qty_per_booking NUMERIC(10,2) NOT NULL DEFAULT 200.0,
  grace_period_mins INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  observed_capacity_qtl_per_hour NUMERIC(10,2),
  last_observed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(centre_id)
);

-- 2. PPC Holidays / Closed dates
CREATE TABLE IF NOT EXISTS ppc_holidays (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL REFERENCES procurement_centres(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Holiday',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(centre_id, holiday_date)
);

-- 3. PPC Slots (generated time slots with capacity tracking)
CREATE TABLE IF NOT EXISTS ppc_slots (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL REFERENCES procurement_centres(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  capacity_qtl NUMERIC(10,2) NOT NULL,
  booked_qtl NUMERIC(10,2) NOT NULL DEFAULT 0,
  farmer_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE', 'LIMITED', 'FULL', 'BLOCKED', 'BREAK', 'COMPLETED')),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(centre_id, slot_date, start_time)
);

-- 4. PPC Slot Overrides (date-specific capacity changes)
CREATE TABLE IF NOT EXISTS ppc_slot_overrides (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL REFERENCES procurement_centres(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  capacity_qtl_per_hour NUMERIC(10,2),
  slot_duration_mins INTEGER,
  buffer_percentage NUMERIC(5,2),
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(centre_id, override_date)
);

-- 5. PPC Bookings (full lifecycle with estimated/actual qty)
CREATE TABLE IF NOT EXISTS ppc_bookings (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL,
  slot_id TEXT NOT NULL REFERENCES ppc_slots(id) ON DELETE CASCADE,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  registration_id TEXT,
  estimated_quantity NUMERIC(10,2) NOT NULL,
  actual_quantity NUMERIC(10,2),
  slot_date DATE NOT NULL,
  slot_start_time TEXT NOT NULL,
  slot_end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BOOKED'
    CHECK (status IN (
      'BOOKED', 'CONFIRMED', 'FARMER_ARRIVED', 'LATE',
      'VERIFICATION', 'WEIGHING', 'PROCESSING', 'COMPLETED',
      'CANCELLED', 'NO_SHOW', 'REJECTED', 'RESCHEDULED'
    )),
  booking_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmation_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  verification_start_time TIMESTAMPTZ,
  weighing_start_time TIMESTAMPTZ,
  processing_start_time TIMESTAMPTZ,
  completion_time TIMESTAMPTZ,
  cancellation_time TIMESTAMPTZ,
  is_late BOOLEAN NOT NULL DEFAULT false,
  late_by_mins INTEGER DEFAULT 0,
  booking_code TEXT NOT NULL,
  crop TEXT NOT NULL,
  vehicle_number TEXT,
  remarks TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppc_bookings_slot ON ppc_bookings(slot_id, status);
CREATE INDEX IF NOT EXISTS idx_ppc_bookings_farmer ON ppc_bookings(farmer_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_ppc_bookings_centre_date ON ppc_bookings(centre_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_ppc_slots_centre_date ON ppc_slots(centre_id, slot_date);

-- 6. PPC Waiting Queue
CREATE TABLE IF NOT EXISTS ppc_waiting_queue (
  id TEXT PRIMARY KEY,
  centre_id TEXT NOT NULL REFERENCES procurement_centres(id) ON DELETE CASCADE,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  queue_date DATE NOT NULL,
  estimated_quantity NUMERIC(10,2) NOT NULL,
  requested_start_time TEXT,
  requested_end_time TEXT,
  crop TEXT NOT NULL,
  queue_position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'WAITING'
    CHECK (status IN ('WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED', 'CANCELLED')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ATOMIC BOOKING FUNCTION — prevents concurrent overbooking
-- ============================================================================
CREATE OR REPLACE FUNCTION book_ppc_slot(
  p_booking_id TEXT, p_centre_id TEXT, p_slot_id TEXT,
  p_farmer_id TEXT, p_farmer_name TEXT, p_phone TEXT,
  p_estimated_qty NUMERIC, p_slot_date DATE,
  p_slot_start TEXT, p_slot_end TEXT,
  p_booking_code TEXT, p_crop TEXT,
  p_vehicle_number TEXT DEFAULT NULL,
  p_registration_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_slot RECORD; v_remaining NUMERIC; v_new_booked NUMERIC; v_max_qty NUMERIC;
BEGIN
  SELECT * INTO v_slot FROM ppc_slots WHERE id = p_slot_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Slot not found'); END IF;
  IF v_slot.is_blocked THEN RETURN jsonb_build_object('success', false, 'error', 'Slot is blocked'); END IF;
  IF v_slot.status IN ('FULL', 'BLOCKED', 'BREAK') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot is not available: ' || v_slot.status);
  END IF;
  SELECT max_qty_per_booking INTO v_max_qty FROM ppc_config WHERE centre_id = p_centre_id;
  IF v_max_qty IS NOT NULL AND p_estimated_qty > v_max_qty THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity exceeds maximum (' || v_max_qty || ' qtl)');
  END IF;
  v_remaining := v_slot.capacity_qtl - v_slot.booked_qtl;
  v_new_booked := v_slot.booked_qtl + p_estimated_qty;
  IF p_estimated_qty > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough capacity. Only ' || v_remaining || ' qtl remaining.', 'remaining', v_remaining);
  END IF;
  UPDATE ppc_slots SET booked_qtl = v_new_booked, farmer_count = farmer_count + 1,
    status = CASE WHEN v_new_booked >= capacity_qtl THEN 'FULL' WHEN v_new_booked >= capacity_qtl * 0.75 THEN 'LIMITED' ELSE 'AVAILABLE' END
  WHERE id = p_slot_id;
  INSERT INTO ppc_bookings (id, centre_id, slot_id, farmer_id, farmer_name, phone, registration_id, estimated_quantity, slot_date, slot_start_time, slot_end_time, status, booking_code, crop, vehicle_number)
  VALUES (p_booking_id, p_centre_id, p_slot_id, p_farmer_id, p_farmer_name, p_phone, p_registration_id, p_estimated_qty, p_slot_date, p_slot_start, p_slot_end, 'BOOKED', p_booking_code, p_crop, p_vehicle_number);
  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'booking_code', p_booking_code, 'remaining_after', v_slot.capacity_qtl - v_new_booked);
END; $$;

-- CANCELLATION FUNCTION — releases capacity atomically
CREATE OR REPLACE FUNCTION cancel_ppc_booking(p_booking_id TEXT, p_reason TEXT DEFAULT 'Cancelled by user')
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE v_booking RECORD; v_slot RECORD;
BEGIN
  SELECT * INTO v_booking FROM ppc_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Booking not found'); END IF;
  IF v_booking.status IN ('COMPLETED', 'CANCELLED', 'NO_SHOW') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking already ' || v_booking.status);
  END IF;
  SELECT * INTO v_slot FROM ppc_slots WHERE id = v_booking.slot_id FOR UPDATE;
  UPDATE ppc_slots SET booked_qtl = GREATEST(0, booked_qtl - v_booking.estimated_quantity), farmer_count = GREATEST(0, farmer_count - 1),
    status = CASE WHEN GREATEST(0, booked_qtl - v_booking.estimated_quantity) >= capacity_qtl THEN 'FULL' WHEN GREATEST(0, booked_qtl - v_booking.estimated_quantity) >= capacity_qtl * 0.75 THEN 'LIMITED' ELSE 'AVAILABLE' END
  WHERE id = v_booking.slot_id;
  UPDATE ppc_bookings SET status = 'CANCELLED', cancellation_time = NOW(), cancelled_reason = p_reason, updated_at = NOW() WHERE id = p_booking_id;
  RETURN jsonb_build_object('success', true, 'released_qty', v_booking.estimated_quantity);
END; $$;

-- Enable RLS
ALTER TABLE ppc_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_slot_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppc_waiting_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for authenticated users — tighten as needed)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppc_config_all' AND tablename = 'ppc_config') THEN
    CREATE POLICY ppc_config_all ON ppc_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppc_holidays_all' AND tablename = 'ppc_holidays') THEN
    CREATE POLICY ppc_holidays_all ON ppc_holidays FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppc_slots_all' AND tablename = 'ppc_slots') THEN
    CREATE POLICY ppc_slots_all ON ppc_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppc_slot_overrides_all' AND tablename = 'ppc_slot_overrides') THEN
    CREATE POLICY ppc_slot_overrides_all ON ppc_slot_overrides FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppc_bookings_all' AND tablename = 'ppc_bookings') THEN
    CREATE POLICY ppc_bookings_all ON ppc_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppc_waiting_queue_all' AND tablename = 'ppc_waiting_queue') THEN
    CREATE POLICY ppc_waiting_queue_all ON ppc_waiting_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ppc_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE ppc_bookings;
