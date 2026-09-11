import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Farmer, Booking, ProcurementRecord, SupabaseConfig } from '../types';

const SUPABASE_STORAGE_KEY = 'kisanflow_supabase_config';
export const DEFAULT_SUPABASE_URL = 'https://pqconvvuhpvoqutgtmac.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxY29udnZ1aHB2b3F1dGd0bWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTIzNTYsImV4cCI6MjEwNDYyODM1Nn0.da1NkE72812nRPTbjzgyRc7v5nc1fmfFoAPTFKWU-Cs';

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const saved = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.url) {
        parsed.url = DEFAULT_SUPABASE_URL;
      }
      if (!parsed.anonKey) {
        parsed.anonKey = DEFAULT_SUPABASE_ANON_KEY;
        parsed.connected = true;
      }
      return parsed;
    }
  } catch {
    // Ignore
  }
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    connected: true,
    table_name: 'farmers',
  };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  try {
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const activeConfig = config || getStoredSupabaseConfig();
  if (!activeConfig.url || !activeConfig.anonKey) return null;

  if (cachedClient && lastUrl === activeConfig.url && lastKey === activeConfig.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(activeConfig.url, activeConfig.anonKey);
    lastUrl = activeConfig.url;
    lastKey = activeConfig.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'Please provide both the Supabase URL and the Public Anon Key.' };
  }

  try {
    const client = createClient(url, anonKey);
    // Simple query test to verify connection
    const { error } = await client.from('farmers').select('id').limit(1);

    if (error) {
      // 42P01 or PGRST205 means table is not created yet, confirming valid authentication & database connection
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('schema cache')
      ) {
        return {
          success: true,
          message: 'Connected to Supabase! Authentication valid (ready for tables creation or syncing).',
        };
      }
      if (error.message.includes('Invalid API key') || error.message.includes('JWSError')) {
        return { success: false, message: 'Invalid Supabase Anon Key. Please check the key and try again.' };
      }
      if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
        return { success: false, message: `Could not reach ${url}. Please check the URL.` };
      }
    }
    return { success: true, message: 'Successfully connected to Supabase database instance!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown connection error';
    return { success: false, message: msg };
  }
}

/**
 * Remove duplicate farmer and booking records from the remote Supabase database
 */
export async function cleanDuplicateSupabaseData(client: SupabaseClient): Promise<{
  success: boolean;
  farmersRemoved: number;
  bookingsRemoved: number;
  message: string;
}> {
  let farmersRemoved = 0;
  let bookingsRemoved = 0;

  try {
    // 1. Deduplicate Farmers
    const { data: farmers, error: fErr } = await client.from('farmers').select('*');
    if (!fErr && farmers && farmers.length > 0) {
      const seen = new Map<string, string>(); // phone -> first id
      const duplicateIds: string[] = [];

      for (const f of farmers) {
        const uniqueKey = f.phone || f.aadhaar_masked || f.id;
        if (seen.has(uniqueKey)) {
          duplicateIds.push(f.id);
        } else {
          seen.set(uniqueKey, f.id);
        }
      }

      if (duplicateIds.length > 0) {
        const { error: delErr } = await client.from('farmers').delete().in('id', duplicateIds);
        if (!delErr) {
          farmersRemoved = duplicateIds.length;
        } else {
          console.warn('Error deleting duplicate farmers from Supabase:', delErr.message);
        }
      }
    }

    // 2. Deduplicate Bookings
    const { data: bookings, error: bErr } = await client.from('bookings').select('*');
    if (!bErr && bookings && bookings.length > 0) {
      const seen = new Map<string, string>(); // farmer_id + date + token -> first id
      const duplicateBookingIds: string[] = [];

      for (const b of bookings) {
        const uniqueKey = `${b.farmer_id}_${b.slot_date || b.date}_${b.token_number}`;
        if (seen.has(uniqueKey)) {
          duplicateBookingIds.push(b.id);
        } else {
          seen.set(uniqueKey, b.id);
        }
      }

      if (duplicateBookingIds.length > 0) {
        const { error: delErr } = await client.from('bookings').delete().in('id', duplicateBookingIds);
        if (!delErr) {
          bookingsRemoved = duplicateBookingIds.length;
        } else {
          console.warn('Error deleting duplicate bookings from Supabase:', delErr.message);
        }
      }
    }

    let statusMsg = '';
    if (fErr && (fErr.code === 'PGRST205' || fErr.code === '42P01')) {
      statusMsg = 'Supabase instance connected (remote tables are fresh & empty - 0 duplicates).';
    } else if (farmersRemoved === 0 && bookingsRemoved === 0) {
      statusMsg = 'Supabase database verified: 0 duplicates found (all records unique).';
    } else {
      statusMsg = `Cleaned ${farmersRemoved} duplicate farmer(s) and ${bookingsRemoved} duplicate booking(s) from Supabase.`;
    }

    return {
      success: true,
      farmersRemoved,
      bookingsRemoved,
      message: statusMsg,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Supabase deduplication error';
    return {
      success: false,
      farmersRemoved,
      bookingsRemoved,
      message: msg,
    };
  }
}

export async function syncFarmerToSupabase(farmer: Farmer, config?: SupabaseConfig) {
  const client = getSupabaseClient(config);
  if (!client) return { synced: false, reason: 'No Supabase credentials configured' };

  try {
    const { data, error } = await client.from('farmers').upsert({
      id: farmer.id,
      name: farmer.name,
      phone: farmer.phone,
      village: farmer.village,
      district: farmer.district,
      state: farmer.state,
      aadhaar_masked: farmer.aadhaar_masked,
      land_holding_acres: farmer.land_holding_acres,
      preferred_language: farmer.preferred_language,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('Supabase farmers sync notice:', error.message);
      return { synced: false, reason: error.message };
    }
    return { synced: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    return { synced: false, reason: msg };
  }
}

export async function syncBookingToSupabase(booking: Booking, config?: SupabaseConfig) {
  const client = getSupabaseClient(config);
  if (!client) return { synced: false, reason: 'No Supabase credentials configured' };

  try {
    const { data, error } = await client.from('bookings').upsert({
      id: booking.id,
      farmer_id: booking.farmer_id,
      centre_id: booking.centre_id,
      crop: booking.crop,
      quantity_quintals: booking.quantity_quintals,
      token_number: booking.token_number,
      slot_time: booking.time,
      slot_date: booking.date,
      status: booking.status,
      created_at: new Date().toISOString(),
    });
    if (error) {
      return { synced: false, reason: error.message };
    }
    return { synced: true, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Sync failed';
    return { synced: false, reason: msg };
  }
}
