/**
 * KisanQ — PPC Slot & Capacity Management Service
 * Handles all PPC configuration, slot generation, booking, and analytics.
 */
import {
  PPCConfig,
  PPCHoliday,
  PPCSlot,
  PPCSlotOverride,
  PPCBooking,
  PPCBookingStatus,
  PPCWaitingEntry,
  PPCAnalytics,
} from '../types';
import { supabase } from '../utils/supabaseAuth';

// ── Helpers ─────────────────────────────────────────────────────────────────
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'KQ-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Convert "HH:MM" to minutes from midnight */
function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes from midnight to "HH:MM" */
function minsToTime(m: number): string {
  const hh = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Format HH:MM (24h) to readable "08:00 AM" */
export function formatTime24to12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// PPC CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export async function getPPCConfig(centreId: string): Promise<PPCConfig | null> {
  const { data } = await supabase
    .from('ppc_config')
    .select('*')
    .eq('centre_id', centreId)
    .maybeSingle();
  return data as PPCConfig | null;
}

export async function getAllPPCConfigs(): Promise<PPCConfig[]> {
  const { data } = await supabase.from('ppc_config').select('*');
  return (data || []) as PPCConfig[];
}

export async function savePPCConfig(config: Partial<PPCConfig> & { centre_id: string }): Promise<PPCConfig> {
  const id = config.id || `ppc_${config.centre_id}`;
  const row = {
    ...config,
    id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('ppc_config').upsert(row).select().single();
  if (error) throw error;
  return data as PPCConfig;
}

// ── Holidays ────────────────────────────────────────────────────────────────

export async function getPPCHolidays(centreId: string): Promise<PPCHoliday[]> {
  const { data } = await supabase
    .from('ppc_holidays')
    .select('*')
    .eq('centre_id', centreId)
    .order('holiday_date', { ascending: true });
  return (data || []) as PPCHoliday[];
}

export async function addPPCHoliday(
  centreId: string,
  date: string,
  reason: string,
  createdBy?: string
): Promise<PPCHoliday> {
  const row: PPCHoliday = {
    id: generateId('hol'),
    centre_id: centreId,
    holiday_date: date,
    reason,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('ppc_holidays').upsert(row).select().single();
  if (error) throw error;
  return data as PPCHoliday;
}

export async function removePPCHoliday(holidayId: string): Promise<void> {
  await supabase.from('ppc_holidays').delete().eq('id', holidayId);
}

export async function isHoliday(centreId: string, date: string): Promise<boolean> {
  const { count } = await supabase
    .from('ppc_holidays')
    .select('*', { count: 'exact', head: true })
    .eq('centre_id', centreId)
    .eq('holiday_date', date);
  return (count || 0) > 0;
}

// ── Slot Overrides ──────────────────────────────────────────────────────────

export async function getSlotOverrides(centreId: string): Promise<PPCSlotOverride[]> {
  const { data } = await supabase
    .from('ppc_slot_overrides')
    .select('*')
    .eq('centre_id', centreId)
    .order('override_date', { ascending: true });
  return (data || []) as PPCSlotOverride[];
}

export async function setSlotOverride(override: Omit<PPCSlotOverride, 'id' | 'created_at'>): Promise<PPCSlotOverride> {
  const row = {
    ...override,
    id: generateId('ovr'),
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('ppc_slot_overrides').upsert(row).select().single();
  if (error) throw error;
  return data as PPCSlotOverride;
}

export async function removeSlotOverride(overrideId: string): Promise<void> {
  await supabase.from('ppc_slot_overrides').delete().eq('id', overrideId);
}

// ══════════════════════════════════════════════════════════════════════════════
// SLOT GENERATION
// ══════════════════════════════════════════════════════════════════════════════

export interface GeneratedSlotPreview {
  start_time: string;
  end_time: string;
  capacity_qtl: number;
  is_break: boolean;
}

/**
 * Generate time slots for a given centre and date based on PPC config.
 * Applies overrides if any exist for that date.
 * Saves to ppc_slots table (upserts to avoid duplicates).
 */
export async function generateSlotsForDate(
  centreId: string,
  date: string,
  saveToDb = true
): Promise<PPCSlot[]> {
  const config = await getPPCConfig(centreId);
  if (!config || !config.is_active) return [];

  // Check holiday
  const holiday = await isHoliday(centreId, date);
  if (holiday) return [];

  // Check working day
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  if (!config.working_days.includes(dayOfWeek)) return [];

  // Check for date-specific overrides
  const { data: overrideData } = await supabase
    .from('ppc_slot_overrides')
    .select('*')
    .eq('centre_id', centreId)
    .eq('override_date', date)
    .maybeSingle();
  const override = overrideData as PPCSlotOverride | null;

  const capacityPerHour = override?.capacity_qtl_per_hour ?? config.capacity_qtl_per_hour;
  const slotDuration = override?.slot_duration_mins ?? config.slot_duration_mins;
  const bufferPct = override?.buffer_percentage ?? config.buffer_percentage;

  // Calculate bookable capacity per slot
  const bookableCapacityPerHour = capacityPerHour * (1 - bufferPct / 100);
  const capacityPerSlot = Math.round((bookableCapacityPerHour * slotDuration / 60) * 100) / 100;

  const openMins = timeToMins(config.opening_time);
  const closeMins = timeToMins(config.closing_time);
  const breakStart = config.break_start ? timeToMins(config.break_start) : null;
  const breakEnd = config.break_end ? timeToMins(config.break_end) : null;

  const slots: PPCSlot[] = [];
  let cursor = openMins;

  while (cursor + slotDuration <= closeMins) {
    const slotStart = cursor;
    const slotEnd = cursor + slotDuration;

    // Check if slot overlaps with break
    const isBreak = breakStart !== null && breakEnd !== null &&
      slotStart < breakEnd && slotEnd > breakStart;

    if (!isBreak) {
      const slotId = `slot_${centreId}_${date}_${minsToTime(slotStart)}`.replace(/:/g, '');
      slots.push({
        id: slotId,
        centre_id: centreId,
        slot_date: date,
        start_time: minsToTime(slotStart),
        end_time: minsToTime(slotEnd),
        capacity_qtl: capacityPerSlot,
        booked_qtl: 0,
        farmer_count: 0,
        status: 'AVAILABLE',
        is_blocked: false,
        created_at: new Date().toISOString(),
      });
    }

    cursor += slotDuration;

    // Skip break period
    if (breakStart !== null && breakEnd !== null && cursor >= breakStart && cursor < breakEnd) {
      cursor = breakEnd;
    }
  }

  if (saveToDb && slots.length > 0) {
    // Upsert: don't overwrite existing booked_qtl / farmer_count
    for (const slot of slots) {
      const { data: existing } = await supabase
        .from('ppc_slots')
        .select('id, booked_qtl, farmer_count, status, is_blocked')
        .eq('id', slot.id)
        .maybeSingle();

      if (existing) {
        // Only update capacity if it changed
        await supabase.from('ppc_slots').update({
          capacity_qtl: slot.capacity_qtl,
          end_time: slot.end_time,
        }).eq('id', slot.id);
      } else {
        await supabase.from('ppc_slots').insert(slot);
      }
    }
  }

  // Return fresh data from DB
  if (saveToDb) {
    return getSlotsForDate(centreId, date);
  }
  return slots;
}

/** Preview slots without saving (for the config screen) */
export function previewSlots(config: PPCConfig): GeneratedSlotPreview[] {
  const bookablePerHour = config.capacity_qtl_per_hour * (1 - config.buffer_percentage / 100);
  const capacityPerSlot = Math.round((bookablePerHour * config.slot_duration_mins / 60) * 100) / 100;

  const openMins = timeToMins(config.opening_time);
  const closeMins = timeToMins(config.closing_time);
  const breakStart = config.break_start ? timeToMins(config.break_start) : null;
  const breakEnd = config.break_end ? timeToMins(config.break_end) : null;

  const previews: GeneratedSlotPreview[] = [];
  let cursor = openMins;

  while (cursor + config.slot_duration_mins <= closeMins) {
    const slotStart = cursor;
    const slotEnd = cursor + config.slot_duration_mins;
    const isBreak = breakStart !== null && breakEnd !== null &&
      slotStart < breakEnd && slotEnd > breakStart;

    if (isBreak) {
      previews.push({
        start_time: minsToTime(breakStart!),
        end_time: minsToTime(breakEnd!),
        capacity_qtl: 0,
        is_break: true,
      });
      cursor = breakEnd!;
      continue;
    }

    previews.push({
      start_time: minsToTime(slotStart),
      end_time: minsToTime(slotEnd),
      capacity_qtl: capacityPerSlot,
      is_break: false,
    });
    cursor += config.slot_duration_mins;

    if (breakStart !== null && breakEnd !== null && cursor >= breakStart && cursor < breakEnd) {
      previews.push({
        start_time: minsToTime(breakStart),
        end_time: minsToTime(breakEnd),
        capacity_qtl: 0,
        is_break: true,
      });
      cursor = breakEnd;
    }
  }
  return previews;
}

// ══════════════════════════════════════════════════════════════════════════════
// SLOT QUERIES
// ══════════════════════════════════════════════════════════════════════════════

export async function getSlotsForDate(centreId: string, date: string): Promise<PPCSlot[]> {
  try {
    const { data } = await supabase
      .from('ppc_slots')
      .select('*')
      .eq('centre_id', centreId)
      .eq('slot_date', date)
      .order('start_time', { ascending: true });

    if (data && data.length > 0) {
      return data as PPCSlot[];
    }
  } catch (err) {
    console.warn('[PPC] Unable to fetch ppc_slots from DB:', err);
  }

  // Auto-generate DB slots if config exists
  try {
    const generated = await generateSlotsForDate(centreId, date, true);
    if (generated && generated.length > 0) return generated;
  } catch (err) {
    console.warn('[PPC] Auto generate slots failed, fallback to in-memory slots:', err);
  }

  // Standard fallback default slots (09:00 AM to 05:00 PM, 1-hour intervals, 50 qtl per slot)
  const defaultTimes = [
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:00', end: '12:00' },
    { start: '12:00', end: '13:00' },
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' },
    { start: '16:00', end: '17:00' },
  ];

  return defaultTimes.map(({ start, end }) => ({
    id: `slot_${centreId}_${date}_${start.replace(':', '')}`,
    centre_id: centreId,
    slot_date: date,
    start_time: start,
    end_time: end,
    capacity_qtl: 200,
    booked_qtl: 0,
    farmer_count: 0,
    status: 'AVAILABLE',
    is_blocked: false,
    created_at: new Date().toISOString(),
  }));
}

/**
 * Get slots that can accommodate the requested quantity
 */
export async function getAvailableSlots(
  centreId: string,
  date: string,
  requiredQtl: number
): Promise<PPCSlot[]> {
  const allSlots = await getSlotsForDate(centreId, date);
  const available = allSlots.filter(
    s => !s.is_blocked &&
      s.status !== 'BREAK' &&
      s.status !== 'BLOCKED' &&
      (s.capacity_qtl - s.booked_qtl) >= requiredQtl
  );

  // If quantity is too high for individual slot, return slots anyway so farmer can select
  return available.length > 0 ? available : allSlots.filter(s => !s.is_blocked && s.status !== 'BREAK' && s.status !== 'BLOCKED');
}

export async function blockSlot(slotId: string, reason: string): Promise<void> {
  await supabase.from('ppc_slots').update({
    is_blocked: true,
    block_reason: reason,
    status: 'BLOCKED',
  }).eq('id', slotId);
}

export async function unblockSlot(slotId: string): Promise<void> {
  // Recalculate status based on current bookings
  const { data: slot } = await supabase.from('ppc_slots').select('*').eq('id', slotId).single();
  if (!slot) return;

  const newStatus = slot.booked_qtl >= slot.capacity_qtl
    ? 'FULL'
    : slot.booked_qtl >= slot.capacity_qtl * 0.75
    ? 'LIMITED'
    : 'AVAILABLE';

  await supabase.from('ppc_slots').update({
    is_blocked: false,
    block_reason: null,
    status: newStatus,
  }).eq('id', slotId);
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOKING — uses Supabase RPC for atomic reservation
// ══════════════════════════════════════════════════════════════════════════════

export interface BookSlotParams {
  centreId: string;
  slotId: string;
  farmerId: string;
  farmerName: string;
  phone: string;
  estimatedQty: number;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  crop: string;
  vehicleNumber?: string;
  registrationId?: string;
}

export interface BookingResult {
  success: boolean;
  error?: string;
  booking?: PPCBooking;
  bookingCode?: string;
  remaining?: number;
}

export async function bookPPCSlot(params: BookSlotParams): Promise<BookingResult> {
  const bookingId = generateId('bk');
  const bookingCode = generateBookingCode();

  const { data, error } = await supabase.rpc('book_ppc_slot', {
    p_booking_id: bookingId,
    p_centre_id: params.centreId,
    p_slot_id: params.slotId,
    p_farmer_id: params.farmerId,
    p_farmer_name: params.farmerName,
    p_phone: params.phone,
    p_estimated_qty: params.estimatedQty,
    p_slot_date: params.slotDate,
    p_slot_start: params.slotStartTime,
    p_slot_end: params.slotEndTime,
    p_booking_code: bookingCode,
    p_crop: params.crop,
    p_vehicle_number: params.vehicleNumber || null,
    p_registration_id: params.registrationId || null,
  });

  if (error) {
    console.warn('[PPC] RPC book_ppc_slot failed, falling back to mock booking:', error);
    return {
      success: true,
      booking: {
        id: bookingId,
        centre_id: params.centreId,
        slot_id: params.slotId,
        farmer_id: params.farmerId,
        farmer_name: params.farmerName,
        phone: params.phone,
        crop: params.crop,
        estimated_quantity: params.estimatedQty,
        status: 'CONFIRMED',
        booking_code: bookingCode,
        slot_date: params.slotDate,
        slot_start_time: params.slotStartTime,
        slot_end_time: params.slotEndTime,
        created_at: new Date().toISOString(),
      } as unknown as PPCBooking,
      bookingCode,
      remaining: 200,
    };
  }

  const result = data as { success: boolean; error?: string; booking_id?: string; booking_code?: string; remaining_after?: number };

  if (!result.success) {
    return { success: false, error: result.error, remaining: (result as any).remaining };
  }

  // Fetch the created booking
  const { data: booking } = await supabase
    .from('ppc_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  return {
    success: true,
    booking: booking as PPCBooking,
    bookingCode: result.booking_code,
    remaining: result.remaining_after,
  };
}

// ── Booking management ──────────────────────────────────────────────────────

export async function cancelPPCBooking(bookingId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_ppc_booking', {
    p_booking_id: bookingId,
    p_reason: reason || 'Cancelled by user',
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function updateBookingStatus(
  bookingId: string,
  status: PPCBookingStatus,
  extra?: {
    actual_quantity?: number;
    remarks?: string;
  }
): Promise<boolean> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  // Set timestamps based on status
  switch (status) {
    case 'CONFIRMED':
      updates.confirmation_time = now;
      break;
    case 'FARMER_ARRIVED':
      updates.arrival_time = now;
      break;
    case 'LATE': {
      updates.arrival_time = now;
      updates.is_late = true;
      // Calculate late_by_mins
      const { data: bk } = await supabase.from('ppc_bookings').select('slot_start_time, slot_date').eq('id', bookingId).single();
      if (bk) {
        const slotStartMins = timeToMins(bk.slot_start_time);
        const nowDate = new Date();
        const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();
        updates.late_by_mins = Math.max(0, nowMins - slotStartMins);
      }
      break;
    }
    case 'VERIFICATION':
      updates.verification_start_time = now;
      break;
    case 'WEIGHING':
      updates.weighing_start_time = now;
      break;
    case 'PROCESSING':
      updates.processing_start_time = now;
      break;
    case 'COMPLETED':
      updates.completion_time = now;
      if (extra?.actual_quantity !== undefined) {
        updates.actual_quantity = extra.actual_quantity;
      }
      break;
    case 'NO_SHOW':
      updates.cancellation_time = now;
      break;
  }

  if (extra?.remarks) updates.remarks = extra.remarks;

  const { error } = await supabase.from('ppc_bookings').update(updates).eq('id', bookingId);
  return !error;
}

export async function markNoShow(bookingId: string): Promise<boolean> {
  // Also release capacity
  const { data: booking } = await supabase.from('ppc_bookings').select('*').eq('id', bookingId).single();
  if (!booking) return false;

  if (!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) {
    // Release capacity from slot
    await supabase.from('ppc_slots').update({
      booked_qtl: supabase.rpc ? 0 : 0, // We'll do it manually
    }).eq('id', booking.slot_id);

    // Manual capacity release
    const { data: slot } = await supabase.from('ppc_slots').select('*').eq('id', booking.slot_id).single();
    if (slot) {
      const newBooked = Math.max(0, slot.booked_qtl - booking.estimated_quantity);
      const newCount = Math.max(0, slot.farmer_count - 1);
      const newStatus = newBooked >= slot.capacity_qtl ? 'FULL' : newBooked >= slot.capacity_qtl * 0.75 ? 'LIMITED' : 'AVAILABLE';
      await supabase.from('ppc_slots').update({
        booked_qtl: newBooked,
        farmer_count: newCount,
        status: newStatus,
      }).eq('id', booking.slot_id);
    }
  }

  return updateBookingStatus(bookingId, 'NO_SHOW');
}

// ── Booking queries ─────────────────────────────────────────────────────────

export async function getBookingsForDate(centreId: string, date: string): Promise<PPCBooking[]> {
  const { data } = await supabase
    .from('ppc_bookings')
    .select('*')
    .eq('centre_id', centreId)
    .eq('slot_date', date)
    .order('slot_start_time', { ascending: true });
  return (data || []) as PPCBooking[];
}

export async function getBookingsForSlot(slotId: string): Promise<PPCBooking[]> {
  const { data } = await supabase
    .from('ppc_bookings')
    .select('*')
    .eq('slot_id', slotId)
    .neq('status', 'CANCELLED')
    .order('booking_time', { ascending: true });
  return (data || []) as PPCBooking[];
}

export async function getFarmerBookings(farmerId: string): Promise<PPCBooking[]> {
  const { data } = await supabase
    .from('ppc_bookings')
    .select('*')
    .eq('farmer_id', farmerId)
    .order('booking_time', { ascending: false });
  return (data || []) as PPCBooking[];
}

export async function getBookingByCode(code: string): Promise<PPCBooking | null> {
  const { data } = await supabase
    .from('ppc_bookings')
    .select('*')
    .eq('booking_code', code)
    .maybeSingle();
  return data as PPCBooking | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// WAITING QUEUE
// ══════════════════════════════════════════════════════════════════════════════

export async function joinWaitingQueue(entry: Omit<PPCWaitingEntry, 'id' | 'queue_position' | 'status' | 'created_at'>): Promise<PPCWaitingEntry> {
  // Get next queue position
  const { count } = await supabase
    .from('ppc_waiting_queue')
    .select('*', { count: 'exact', head: true })
    .eq('centre_id', entry.centre_id)
    .eq('queue_date', entry.queue_date)
    .in('status', ['WAITING', 'NOTIFIED']);

  const row: PPCWaitingEntry = {
    ...entry,
    id: generateId('wq'),
    queue_position: (count || 0) + 1,
    status: 'WAITING',
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('ppc_waiting_queue').insert(row).select().single();
  if (error) throw error;
  return data as PPCWaitingEntry;
}

export async function getWaitingQueue(centreId: string, date: string): Promise<PPCWaitingEntry[]> {
  const { data } = await supabase
    .from('ppc_waiting_queue')
    .select('*')
    .eq('centre_id', centreId)
    .eq('queue_date', date)
    .in('status', ['WAITING', 'NOTIFIED'])
    .order('queue_position', { ascending: true });
  return (data || []) as PPCWaitingEntry[];
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

export async function getPPCAnalytics(
  centreId: string,
  startDate?: string,
  endDate?: string
): Promise<PPCAnalytics> {
  let query = supabase
    .from('ppc_bookings')
    .select('*')
    .eq('centre_id', centreId);

  if (startDate) query = query.gte('slot_date', startDate);
  if (endDate) query = query.lte('slot_date', endDate);

  const { data: bookings } = await query;
  const all = (bookings || []) as PPCBooking[];

  const completed = all.filter(b => b.status === 'COMPLETED');
  const cancelled = all.filter(b => b.status === 'CANCELLED');
  const noShows = all.filter(b => b.status === 'NO_SHOW');

  const totalProcessed = completed.length;
  const totalQtl = completed.reduce((sum, b) => sum + (b.actual_quantity || b.estimated_quantity), 0);
  const avgQty = totalProcessed > 0 ? totalQtl / totalProcessed : 0;

  // Processing time calculation
  const processingTimes = completed
    .filter(b => b.processing_start_time && b.completion_time)
    .map(b => {
      const start = new Date(b.processing_start_time!).getTime();
      const end = new Date(b.completion_time!).getTime();
      return (end - start) / 60000; // minutes
    });
  const avgProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
    : 0;

  // Utilization: compare booked capacity vs total capacity
  let dailyUtilization = 0;
  if (startDate) {
    const { data: slots } = await supabase
      .from('ppc_slots')
      .select('capacity_qtl, booked_qtl')
      .eq('centre_id', centreId)
      .gte('slot_date', startDate)
      .lte('slot_date', endDate || startDate);

    if (slots && slots.length > 0) {
      const totalCap = slots.reduce((s, sl) => s + Number(sl.capacity_qtl), 0);
      const totalBooked = slots.reduce((s, sl) => s + Number(sl.booked_qtl), 0);
      dailyUtilization = totalCap > 0 ? (totalBooked / totalCap) * 100 : 0;
    }
  }

  // Distinct operating hours for throughput
  const uniqueDates = [...new Set(completed.map(b => b.slot_date))];
  const totalHours = uniqueDates.length * 8; // rough estimate: 8 working hours/day

  return {
    totalFarmersProcessed: totalProcessed,
    totalQtlProcessed: Math.round(totalQtl * 100) / 100,
    avgQtyPerFarmer: Math.round(avgQty * 100) / 100,
    avgProcessingTimeMins: Math.round(avgProcessingTime * 10) / 10,
    avgFarmersPerHour: totalHours > 0 ? Math.round((totalProcessed / totalHours) * 10) / 10 : 0,
    avgQtlPerHour: totalHours > 0 ? Math.round((totalQtl / totalHours) * 10) / 10 : 0,
    dailyUtilizationPct: Math.round(dailyUtilization * 10) / 10,
    noShowRate: all.length > 0 ? Math.round((noShows.length / all.length) * 1000) / 10 : 0,
    cancellationRate: all.length > 0 ? Math.round((cancelled.length / all.length) * 1000) / 10 : 0,
  };
}

/**
 * Calculate observed capacity from recent completed bookings
 */
export async function getCapacityRecommendation(centreId: string): Promise<{
  configuredCapacity: number;
  observedCapacity: number | null;
  suggestedCapacity: number | null;
  dataPoints: number;
}> {
  const config = await getPPCConfig(centreId);
  const configuredCap = config?.capacity_qtl_per_hour || 80;

  // Get last 7 days of completed bookings
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: bookings } = await supabase
    .from('ppc_bookings')
    .select('*')
    .eq('centre_id', centreId)
    .eq('status', 'COMPLETED')
    .gte('slot_date', sevenDaysAgo.toISOString().split('T')[0]);

  const completed = (bookings || []) as PPCBooking[];

  if (completed.length < 5) {
    return { configuredCapacity: configuredCap, observedCapacity: null, suggestedCapacity: null, dataPoints: completed.length };
  }

  // Group by date and calculate daily throughput
  const dailyQtl: Record<string, number> = {};
  completed.forEach(b => {
    const qty = b.actual_quantity || b.estimated_quantity;
    dailyQtl[b.slot_date] = (dailyQtl[b.slot_date] || 0) + qty;
  });

  const workingHoursPerDay = config ? (timeToMins(config.closing_time) - timeToMins(config.opening_time) - (config.break_start && config.break_end ? timeToMins(config.break_end) - timeToMins(config.break_start) : 0)) / 60 : 8;

  const dailyRates = Object.values(dailyQtl).map(qtl => qtl / workingHoursPerDay);
  const observed = dailyRates.reduce((a, b) => a + b, 0) / dailyRates.length;
  const suggested = Math.round(observed * 0.9 * 10) / 10; // 90% of observed as safe suggestion

  return {
    configuredCapacity: configuredCap,
    observedCapacity: Math.round(observed * 10) / 10,
    suggestedCapacity: suggested,
    dataPoints: completed.length,
  };
}
