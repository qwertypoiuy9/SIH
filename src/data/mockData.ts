/**
 * KisanQ — Static fallback data
 * Only used when Supabase is unreachable.
 * All centre IDs match the schema.sql seeded IDs exactly.
 * No dummy farmer records, tokens, or transactions.
 */
import { Centre, Crop } from '../types';

// Fallback crops — schema-seeded MSP values 2026-27
export const INITIAL_CROPS: Crop[] = [
  { id: 'paddy',     name: 'Paddy (వరి)',            category: 'Kharif Cereal',    msp_per_quintal: 2300, icon: '🌾', season: 'Kharif', primary_states: ['Telangana','Andhra Pradesh'] },
  { id: 'wheat',     name: 'Wheat (గోధుమ)',           category: 'Rabi Cereal',      msp_per_quintal: 2275, icon: '🌾', season: 'Rabi',   primary_states: ['Punjab','Haryana'] },
  { id: 'maize',     name: 'Maize (మొక్కజొన్న)',      category: 'Cereal',           msp_per_quintal: 2225, icon: '🌽', season: 'Kharif', primary_states: ['Telangana','Karnataka'] },
  { id: 'cotton',    name: 'Cotton (పత్తి)',           category: 'Kharif Commercial', msp_per_quintal: 7121, icon: '☁️', season: 'Kharif', primary_states: ['Telangana','Andhra Pradesh'] },
  { id: 'jowar',     name: 'Jowar (జొన్న)',            category: 'Kharif Cereal',    msp_per_quintal: 3371, icon: '🌾', season: 'Kharif', primary_states: ['Telangana','Maharashtra'] },
  { id: 'arhar',     name: 'Arhar/Tur (కంది)',        category: 'Kharif Pulse',     msp_per_quintal: 7550, icon: '🌱', season: 'Kharif', primary_states: ['Telangana','Maharashtra'] },
  { id: 'groundnut', name: 'Groundnut (వేరుశనగ)',     category: 'Kharif Oilseed',   msp_per_quintal: 6783, icon: '🥜', season: 'Kharif', primary_states: ['Telangana','Gujarat'] },
  { id: 'sunflower', name: 'Sunflower (పొద్దుతిరుగుడు)', category: 'Kharif Oilseed', msp_per_quintal: 7280, icon: '🌻', season: 'Kharif', primary_states: ['Telangana','Karnataka'] },
];

// Fallback centres — IDs must exactly match schema.sql + centreService
// Used only when Supabase is offline. Real data comes from procurement_centres table.
export const INITIAL_CENTRES: Centre[] = [
  {
    id: 'ctr_wgl_lakshmipur',
    name: 'Lakshmipur Government Procurement Centre',
    address: 'Lakshmipur Village, Warangal Rural, Telangana 506101',
    district: 'Warangal', state: 'Telangana',
    latitude: 17.9784, longitude: 79.5941,
    capacity_per_day: 150, current_queue: 0, status: 'OPTIMAL',
    distance_km: 0, avg_processing_mins: 45,
    open_hours: '08:30 AM - 05:30 PM', counters_active: 3,
    accepted_crops: ['Paddy', 'Maize', 'Jowar'],
  },
  {
    id: 'ctr_wgl_ramapuram',
    name: 'Ramapuram APMC Procurement Centre',
    address: 'Ramapuram, Warangal Urban, Telangana 506002',
    district: 'Warangal', state: 'Telangana',
    latitude: 18.0023, longitude: 79.5702,
    capacity_per_day: 180, current_queue: 0, status: 'OPTIMAL',
    distance_km: 0, avg_processing_mins: 40,
    open_hours: '08:00 AM - 06:00 PM', counters_active: 4,
    accepted_crops: ['Paddy', 'Cotton', 'Soybean'],
  },
  {
    id: 'ctr_wgl_kothuru',
    name: 'Kothuru Primary Processing Centre',
    address: 'Kothuru Mandal, Warangal, Telangana 506330',
    district: 'Warangal', state: 'Telangana',
    latitude: 17.9345, longitude: 79.6112,
    capacity_per_day: 120, current_queue: 0, status: 'OPTIMAL',
    distance_km: 0, avg_processing_mins: 50,
    open_hours: '09:00 AM - 05:00 PM', counters_active: 2,
    accepted_crops: ['Paddy', 'Maize'],
  },
];
