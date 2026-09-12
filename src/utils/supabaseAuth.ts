/**
 * KisanFlow — Supabase Auth Client
 * Single source of truth for the authenticated Supabase client.
 * Uses ONLY environment variables — no hardcoded credentials.
 */
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { UserProfile, LanguageCode } from '../types';

// ── Supabase connection (env-only, never hardcoded secrets) ─────────────────
const SUPA_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL || '';
const SUPA_KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPA_URL || !SUPA_KEY) {
  console.error('[KisanFlow] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set in .env.local');
}

export const supabase: SupabaseClient = createClient(SUPA_URL, SUPA_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Geocode an address string → lat/lng using Nominatim (free, no key) ──────
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Nominatim unavailable
  }
  return null;
}

// ── Profile helpers ──────────────────────────────────────────────────────────

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: profile.id,
    role: profile.role,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    village: profile.village,
    mandal: profile.mandal,
    district: profile.district,
    state: profile.state,
    pincode: profile.pincode,
    latitude: profile.latitude,
    longitude: profile.longitude,
    aadhaar_masked: profile.aadhaar_masked,
    land_holding_acres: profile.land_holding_acres,
    preferred_language: profile.preferred_language || 'te',
    employee_id: profile.employee_id,
    centre_id: profile.centre_id,
    designation: profile.designation,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[KisanFlow] upsertProfile error:', error.message);
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as UserProfile;
}

// ── Auth operations ──────────────────────────────────────────────────────────

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'farmer' | 'operator' | 'government' | 'support';
  address?: string;
  village?: string;
  mandal?: string;
  district?: string;
  state?: string;
  pincode?: string;
  preferred_language?: LanguageCode;
  land_holding_acres?: number;
  aadhaar_masked?: string;
  employee_id?: string;
  centre_id?: string;
  designation?: string;
}

export async function signUpWithEmail(params: SignUpParams): Promise<{
  user: User | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name: params.name,
        role: params.role,
        phone: params.phone,
      },
    },
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Sign-up failed — no user returned.' };

  // Geocode address → get lat/lng
  const addressQuery = [params.village, params.mandal, params.district, params.state, 'India']
    .filter(Boolean).join(', ');
  const coords = await geocodeAddress(addressQuery);

  // Build profile object
  const profile: UserProfile = {
    id: data.user.id,
    role: params.role,
    name: params.name,
    phone: params.phone,
    email: params.email,
    address: params.address,
    village: params.village,
    mandal: params.mandal,
    district: params.district,
    state: params.state,
    pincode: params.pincode,
    latitude: coords?.lat,
    longitude: coords?.lng,
    aadhaar_masked: params.aadhaar_masked,
    land_holding_acres: params.land_holding_acres,
    preferred_language: params.preferred_language || 'te',
    employee_id: params.employee_id,
    centre_id: params.centre_id,
    designation: params.designation,
  };

  await upsertProfile(profile);
  return { user: data.user, error: null };
}

export async function signInWithEmail(email: string, password: string): Promise<{
  session: Session | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { session: null, error: error.message };
  return { session: data.session, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
