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

// ── Google Maps Geocoding API key ───────────────────────────────────────────
// ── Google Maps key (kept for future use when billing is enabled) ───────────
const GMAPS_KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_KEY || '';

// ── Reverse geocode lat/lng → Indian address components ──────────────────────
// Uses Google Maps if billing enabled, falls back to Nominatim (free, no key)
export interface ReverseGeocodeResult {
  state: string;
  district: string;
  mandal: string;
  village: string;
  pincode: string;
  formattedAddress: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  // --- Try Google Maps first (if key is active + billing enabled) ---
  if (GMAPS_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAPS_KEY}&language=en&region=IN`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const components = data.results[0].address_components as Array<{ long_name: string; types: string[] }>;
          const get = (...types: string[]) =>
            components.find(c => types.some(t => c.types.includes(t)))?.long_name || '';
          return {
            village: get('locality', 'sublocality_level_1', 'sublocality', 'neighborhood'),
            mandal:  get('administrative_area_level_3', 'sublocality_level_1'),
            district: get('administrative_area_level_2').replace(/ [Dd]istrict$/, ''),
            state:   get('administrative_area_level_1'),
            pincode: get('postal_code'),
            formattedAddress: data.results[0].formatted_address || '',
          };
        }
        // If REQUEST_DENIED / billing issue, fall through to Nominatim
        if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
          console.warn('[KisanFlow] Google Maps billing not enabled, using Nominatim fallback');
        }
      }
    } catch { /* fall through */ }
  }

  // --- Nominatim (OpenStreetMap) fallback — completely free, no key needed ---
  return reverseGeocodeNominatim(lat, lng);
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'KisanFlow-MSP/1.0 (https://kisanflow-app.vercel.app)',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;

    const addr = data.address || {};

    // Nominatim address fields for India:
    // village/town/city/suburb → village
    // county/state_district → district
    // state_district/suburb → mandal
    // state → state
    // postcode → pincode
    const village =
      addr.village || addr.town || addr.suburb || addr.city_block ||
      addr.city || addr.residential || addr.hamlet || '';

    const district =
      (addr.county || addr.state_district || addr.district || '')
        .replace(/ [Dd]istrict$/, '')
        .replace(/ [Mm]andal$/, '');

    const mandal =
      addr.state_district || addr.suburb || addr.locality || addr.county || '';

    return {
      village,
      mandal: mandal !== district ? mandal : '',
      district,
      state: addr.state || '',
      pincode: addr.postcode || '',
      formattedAddress: data.display_name || `${village}, ${district}, ${addr.state || ''}`,
    };
  } catch {
    return null;
  }
}

// ── Forward geocode address string → lat/lng ─────────────────────────────────
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;

  // Try Google Maps first if billing is enabled
  if (GMAPS_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', India')}&key=${GMAPS_KEY}&region=IN&language=en`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          return { lat: data.results[0].geometry.location.lat, lng: data.results[0].geometry.location.lng };
        }
      }
    } catch { /* fall through */ }
  }

  // Nominatim fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'KisanFlow-MSP/1.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }

  return null;
}

// ── Profile helpers ──────────────────────────────────────────────────────────

export async function upsertProfile(profile: UserProfile): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').upsert({
    id: profile.id,
    role: profile.role,
    name: profile.name,
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
    village: profile.village || '',
    mandal: profile.mandal || '',
    district: profile.district || '',
    state: profile.state || '',
    pincode: profile.pincode || '',
    latitude: profile.latitude || null,
    longitude: profile.longitude || null,
    aadhaar_masked: profile.aadhaar_masked || '',
    land_holding_acres: profile.land_holding_acres || null,
    preferred_language: profile.preferred_language || 'te',
    employee_id: profile.employee_id || '',
    centre_id: profile.centre_id || '',
    designation: profile.designation || '',
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('[KisanFlow] upsertProfile error:', error.message);
    return { error: error.message };
  }
  return { error: null };
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
  // GPS coords — if provided directly, skips forward geocoding
  latitude?: number;
  longitude?: number;
}

export async function signUpWithEmail(params: SignUpParams): Promise<{
  user: User | null;
  session: Session | null;
  error: string | null;
  needsEmailConfirmation: boolean;
}> {
  // Step 1: Sign up
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

  if (error) {
    let msg = error.message;
    // Rate limit hit — even with email confirm OFF, Supabase still rate-limits signups
    if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || msg.includes('too many requests') || error.status === 429) {
      msg = 'Too many sign-up attempts. Please wait 1–2 minutes and try again. (Supabase free tier limit)';
    } else if (msg.includes('already registered') || msg.includes('User already registered')) {
      msg = 'This email is already registered. Please log in instead.';
    }
    return { user: null, session: null, error: msg, needsEmailConfirmation: false };
  }
  if (!data.user) return { user: null, session: null, error: 'Sign-up failed — no user returned.', needsEmailConfirmation: false };

  // Step 2: Get coords — use GPS directly if provided, otherwise forward-geocode
  let coords: { lat: number; lng: number } | null = null;
  if (params.latitude && params.longitude) {
    coords = { lat: params.latitude, lng: params.longitude };
  } else {
    const addressQuery = [params.village, params.mandal, params.district, params.state, 'India']
      .filter(Boolean).join(', ');
    coords = await geocodeAddress(addressQuery);
  }

  // Step 3: Build profile
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

  // Step 4: Check if email confirmation is needed
  // Supabase returns a session immediately when email confirmation is OFF
  const needsEmailConfirmation = !data.session;

  // Step 5: If we have a session (email confirm OFF), upsert profile now
  if (data.session) {
    await upsertProfile(profile);
  } else {
    // Email confirm ON — try to sign in immediately to get a session and save profile
    // This works if the user already confirmed OR if Supabase auto-confirms
    const signInResult = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });
    if (signInResult.data.session) {
      await upsertProfile(profile);
      return {
        user: signInResult.data.user,
        session: signInResult.data.session,
        error: null,
        needsEmailConfirmation: false,
      };
    }
    // If sign-in also failed (email not confirmed yet), store profile data in localStorage
    // so we can upsert it when they confirm and come back
    try {
      localStorage.setItem(`kisanflow_pending_profile_${data.user.id}`, JSON.stringify(profile));
    } catch { /* ignore */ }
  }

  return {
    user: data.user,
    session: data.session,
    error: null,
    needsEmailConfirmation,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<{
  session: Session | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Make error messages user-friendly
    let msg = error.message;
    if (msg.includes('Email not confirmed')) {
      msg = 'Your email is not confirmed. Please check your inbox and click the confirmation link, then try again. (Or ask admin to disable email confirmation for demo.)';
    } else if (msg.includes('Invalid login credentials')) {
      msg = 'Incorrect email or password. Please check and try again.';
    } else if (msg.includes('too many requests')) {
      msg = 'Too many login attempts. Please wait a few minutes and try again.';
    }
    return { session: null, error: msg };
  }

  // After successful login, check if there's a pending profile to upsert
  if (data.session) {
    const pendingKey = `kisanflow_pending_profile_${data.user.id}`;
    const pendingProfile = localStorage.getItem(pendingKey);
    if (pendingProfile) {
      try {
        const profile = JSON.parse(pendingProfile) as UserProfile;
        await upsertProfile(profile);
        localStorage.removeItem(pendingKey);
      } catch { /* ignore */ }
    }
  }

  return { session: data.session, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
