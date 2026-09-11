// Clean initial data: only master configuration without fake farmer records or dummy tokens
import { Centre, Crop } from '../types';

export const INITIAL_CROPS: Crop[] = [
  { id: 'paddy', name: 'Paddy (వరి / धान)', category: 'Cereals', msp_per_quintal: 1950, icon: '🌾' },
  { id: 'wheat', name: 'Wheat (గోధుమ / गेहूँ)', category: 'Cereals', msp_per_quintal: 2275, icon: '🌾' },
  { id: 'maize', name: 'Maize (మొక్కజొన్న / मक्का)', category: 'Coarse Cereals', msp_per_quintal: 2090, icon: '🌽' },
  { id: 'cotton', name: 'Cotton (పత్తి / कपास)', category: 'Commercial', msp_per_quintal: 7020, icon: '☁️' },
  { id: 'pulses', name: 'Pulses (ఇతర / दालें)', category: 'Pulses', msp_per_quintal: 7000, icon: '🌱' },
];

export const INITIAL_CENTRES: Centre[] = [
  {
    id: 'centre_lakshmipur',
    name: 'Lakshmipur Procurement Centre',
    district: 'Warangal',
    state: 'Telangana',
    capacity_per_day: 150,
    current_queue: 0,
    status: 'OPTIMAL',
    distance_km: 2.4,
    avg_processing_mins: 45,
    open_hours: '08:30 AM - 05:30 PM',
    counters_active: 3,
  },
  {
    id: 'centre_ramapuram',
    name: 'Ramapuram Procurement Centre',
    district: 'Warangal',
    state: 'Telangana',
    capacity_per_day: 180,
    current_queue: 0,
    status: 'OPTIMAL',
    distance_km: 6.8,
    avg_processing_mins: 40,
    open_hours: '08:30 AM - 05:30 PM',
    counters_active: 4,
  },
  {
    id: 'centre_kothuru',
    name: 'Kothuru Procurement Centre',
    district: 'Warangal',
    state: 'Telangana',
    capacity_per_day: 120,
    current_queue: 0,
    status: 'OPTIMAL',
    distance_km: 9.2,
    avg_processing_mins: 45,
    open_hours: '09:00 AM - 05:00 PM',
    counters_active: 2,
  },
];
