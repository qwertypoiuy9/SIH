/**
 * KisanQ Procurement Centre Service
 * Priority order:
 *  1. Supabase `procurement_centres` table — Telangana centres first, sorted by distance
 *  2. OSM Overpass fallback for discovery
 *  3. INITIAL_CENTRES static fallback (offline)
 */
import { Centre } from '../types';
import { supabase } from '../utils/supabaseAuth';
import { haversineKm } from './weatherService';
import { INITIAL_CENTRES } from '../data/mockData';

export interface CentreFilter {
  showOpenOnly?: boolean;
  acceptedCrop?: string;
  maxDistanceKm?: number;
  district?: string;
  mandal?: string;
  pincode?: string;
  stateFilter?: 'telangana_first' | 'all';
}

// ── Fetch centres from Supabase — Telangana first, then by distance ─────────
export async function fetchCentresFromDB(
  farmerLat?: number,
  farmerLng?: number,
  filter?: CentreFilter
): Promise<Centre[]> {
  try {
    let query = supabase
      .from('procurement_centres')
      .select('*');

    // Apply district filter if specified
    if (filter?.district) {
      query = query.ilike('district', `%${filter.district}%`);
    }
    if (filter?.mandal) {
      query = query.ilike('mandal', `%${filter.mandal}%`);
    }
    if (filter?.pincode) {
      query = query.eq('pincode', filter.pincode);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error || !data || data.length === 0) return INITIAL_CENTRES;

    let centres: Centre[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address || '',
      district: row.district,
      state: row.state,
      latitude: row.latitude,
      longitude: row.longitude,
      capacity_per_day: row.capacity_per_day || 150,
      current_queue: row.current_queue || 0,
      status: (row.status || 'OPTIMAL') as Centre['status'],
      distance_km: 0,
      avg_processing_mins: row.avg_processing_mins || 45,
      open_hours: row.open_hours || '08:00 AM - 06:00 PM',
      counters_active: row.active_counters || row.counters_active || 3,
      accepted_crops: row.accepted_crops || [],
      contact: row.contact || '',
      is_open: isCurrentlyOpen(row.open_hours || '08:00 AM - 06:00 PM'),
    }));

    // Calculate distances
    if (farmerLat !== undefined && farmerLng !== undefined) {
      centres = centres.map((c) => ({
        ...c,
        distance_km: c.latitude && c.longitude
          ? Math.round(haversineKm(farmerLat, farmerLng, c.latitude, c.longitude) * 10) / 10
          : 999,
      }));
    }

    // Sort: Telangana first, then by distance
    centres.sort((a, b) => {
      const aTS = a.state === 'Telangana' ? 0 : 1;
      const bTS = b.state === 'Telangana' ? 0 : 1;
      if (aTS !== bTS) return aTS - bTS;
      return a.distance_km - b.distance_km;
    });

  // Apply filters
    // Apply filters
    if (filter?.showOpenOnly) {
      centres = centres.filter((c) => c.is_open);
    }
    if (filter?.acceptedCrop) {
      centres = centres.filter(
        (c) =>
          !c.accepted_crops?.length ||
          c.accepted_crops.some((crop) =>
            crop.toLowerCase().includes(filter.acceptedCrop!.toLowerCase())
          )
      );
    }
    if (filter?.maxDistanceKm) {
      centres = centres.filter((c) => c.distance_km <= filter.maxDistanceKm!);
    }

    return centres;
  } catch {
    return INITIAL_CENTRES;
  }
}

// ── Discover nearby procurement facilities via OSM Overpass (fallback) ────
export async function discoverNearbyViaOSM(
  lat: number,
  lng: number,
  radiusM = 30000
): Promise<Partial<Centre>[]> {
  try {
    // Query OSM for agricultural procurement / government market facilities
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="marketplace"]["government"](around:${radiusM},${lat},${lng});
        node["office"="government"]["landuse"="retail"](around:${radiusM},${lat},${lng});
        way["building"="warehouse"]["operator"~"government|govt|APMC|mandi|procurement",i](around:${radiusM},${lat},${lng});
        node["man_made"="storage_tank"]["crop"](around:${radiusM},${lat},${lng});
      );
      out body;
    `;
    const url = 'https://overpass-api.de/api/interpreter';
    const res = await fetch(url, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements || []).map((el: Record<string, unknown>) => {
      const tags = el.tags as Record<string, string> || {};
      const elLat = el.lat as number;
      const elLon = el.lon as number;
      return {
        id: `osm_${el.id}`,
        name: tags.name || tags['name:en'] || 'Government Facility',
        address: [tags['addr:full'], tags['addr:city'], tags['addr:state']].filter(Boolean).join(', '),
        district: tags['addr:city'] || tags['addr:district'] || '',
        state: tags['addr:state'] || '',
        latitude: elLat,
        longitude: elLon,
        distance_km: elLat && elLon ? Math.round(haversineKm(lat, lng, elLat, elLon) * 10) / 10 : 999,
        capacity_per_day: 100,
        current_queue: 0,
        status: 'OPTIMAL' as const,
        avg_processing_mins: 45,
        open_hours: '08:00 AM - 05:00 PM',
        counters_active: 2,
      };
    });
  } catch {
    return [];
  }
}

// ── Upsert a centre into Supabase (admin use) ────────────────────────────
export async function upsertCentre(centre: Partial<Centre> & { id: string }): Promise<boolean> {
  const { error } = await supabase.from('procurement_centres').upsert({
    id: centre.id,
    name: centre.name,
    address: centre.address,
    district: centre.district,
    state: centre.state,
    latitude: centre.latitude,
    longitude: centre.longitude,
    capacity_per_day: centre.capacity_per_day || 150,
    active_counters: centre.counters_active || 3,
    open_hours: centre.open_hours || '08:00 AM - 06:00 PM',
    status: centre.status || 'OPTIMAL',
    accepted_crops: centre.accepted_crops || [],
    contact: centre.contact || '',
  });
  return !error;
}

// ── Check if a centre is currently open ────────────────────────────────
function isCurrentlyOpen(hoursStr: string): boolean {
  try {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMins = hours * 60 + minutes;

    const match = hoursStr.match(/(\d+):(\d+)\s*(AM|PM).*?(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return true;

    const toMins = (h: string, m: string, period: string) => {
      let hh = parseInt(h);
      if (period.toUpperCase() === 'PM' && hh !== 12) hh += 12;
      if (period.toUpperCase() === 'AM' && hh === 12) hh = 0;
      return hh * 60 + parseInt(m);
    };

    const openMins = toMins(match[1], match[2], match[3]);
    const closeMins = toMins(match[4], match[5], match[6]);
    return currentMins >= openMins && currentMins <= closeMins;
  } catch {
    return true;
  }
}
