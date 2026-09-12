/**
 * supabaseClient.ts — legacy shim
 * All Supabase access now goes through supabaseAuth.ts which uses env vars only.
 * This file is kept for backward compatibility with any remaining imports.
 */
import { UserProfile, Registration, SupabaseConfig } from '../types';
import { supabase } from './supabaseAuth';

export const DEFAULT_SUPABASE_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
export const DEFAULT_SUPABASE_ANON_KEY = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

export function getStoredSupabaseConfig(): SupabaseConfig {
  return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY, connected: true };
}

export function saveSupabaseConfig(_config: SupabaseConfig) { /* no-op */ }
export function getSupabaseClient() { return supabase; }

// Legacy sync helpers — now use the shared client
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('procurement_centres').select('id').limit(1);
    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return { success: true, message: 'Connected — tables need to be created via schema.sql.' };
    }
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Supabase connected successfully.' };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function syncFarmerToSupabase(farmer: UserProfile) {
  const { error } = await supabase.from('profiles').upsert({
    id: farmer.id,
    name: farmer.name,
    phone: farmer.phone,
    village: farmer.village,
    district: farmer.district,
    state: farmer.state,
    aadhaar_masked: farmer.aadhaar_masked,
    land_holding_acres: farmer.land_holding_acres,
    preferred_language: farmer.preferred_language,
    updated_at: new Date().toISOString(),
  });
  return { synced: !error, reason: error?.message };
}

export async function syncBookingToSupabase(booking: Registration) {
  const { error } = await supabase.from('registrations').upsert(booking);
  return { synced: !error, reason: error?.message };
}
