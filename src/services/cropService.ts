/**
 * KisanFlow Crop Service
 * Provides district-based, regionally relevant crop recommendations.
 * Falls back to a comprehensive hardcoded dataset when Supabase is unavailable.
 */
import { Crop } from '../types';
import { supabase } from '../utils/supabaseAuth';

// ── Comprehensive Indian crop database with regional relevance ─────────────
// MSP rates 2024-25 (from government notification)
export const INDIA_CROPS: Crop[] = [
  // Cereals / Kharif
  { id: 'paddy', name: 'Paddy', local_name: 'వరి / धान / ধান / ভাত / ধান', category: 'Kharif Cereal', msp_per_quintal: 2300, icon: '🌾', season: 'Kharif', primary_states: ['Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'West Bengal', 'Odisha', 'Punjab', 'Haryana', 'Karnataka', 'Kerala', 'Assam'] },
  { id: 'jowar', name: 'Jowar (Sorghum)', local_name: 'జొన్న / ज्वार / ಜೋಳ', category: 'Kharif Cereal', msp_per_quintal: 3371, icon: '🌾', season: 'Kharif', primary_states: ['Maharashtra', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Rajasthan'] },
  { id: 'bajra', name: 'Bajra (Pearl Millet)', local_name: 'సజ్జ / बाजरा / ಬಜ್ರ', category: 'Kharif Cereal', msp_per_quintal: 2625, icon: '🌾', season: 'Kharif', primary_states: ['Rajasthan', 'Gujarat', 'Haryana', 'Uttar Pradesh', 'Maharashtra'] },
  { id: 'maize', name: 'Maize', local_name: 'మొక్కజొన్న / मक्का / ಮೆಕ್ಕೆ ಜೋಳ', category: 'Kharif Cereal', msp_per_quintal: 2225, icon: '🌽', season: 'Kharif/Rabi', primary_states: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Uttar Pradesh'] },
  { id: 'ragi', name: 'Ragi (Finger Millet)', local_name: 'రాగులు / रागी / ರಾಗಿ / கேழ்வரகு', category: 'Kharif Cereal', msp_per_quintal: 4290, icon: '🌾', season: 'Kharif', primary_states: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Odisha'] },
  // Rabi Cereals
  { id: 'wheat', name: 'Wheat', local_name: 'గోధుమ / गेहूँ / ਕਣਕ', category: 'Rabi Cereal', msp_per_quintal: 2275, icon: '🌾', season: 'Rabi', primary_states: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Bihar'] },
  { id: 'barley', name: 'Barley', local_name: 'యవలు / जौ / ਜੌਂ', category: 'Rabi Cereal', msp_per_quintal: 1735, icon: '🌾', season: 'Rabi', primary_states: ['Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Haryana', 'Punjab'] },
  // Pulses - Kharif
  { id: 'arhar', name: 'Arhar/Tur (Pigeon Pea)', local_name: 'కంది / अरहर / ತೊಗರಿ / துவரை', category: 'Kharif Pulse', msp_per_quintal: 7550, icon: '🌱', season: 'Kharif', primary_states: ['Maharashtra', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Madhya Pradesh', 'Uttar Pradesh'] },
  { id: 'moong', name: 'Moong (Green Gram)', local_name: 'పెసలు / मूंग / ಹೆಸರು / பயறு', category: 'Kharif Pulse', msp_per_quintal: 8682, icon: '🌱', season: 'Kharif', primary_states: ['Rajasthan', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Madhya Pradesh', 'Karnataka'] },
  { id: 'urad', name: 'Urad (Black Gram)', local_name: 'మినుములు / उड़द / ಉದ್ದು / உளுந்து', category: 'Kharif Pulse', msp_per_quintal: 7400, icon: '🌱', season: 'Kharif', primary_states: ['Madhya Pradesh', 'Uttar Pradesh', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu'] },
  // Pulses - Rabi
  { id: 'chana', name: 'Chana (Gram)', local_name: 'శనగలు / चना / ಕಡಲೆ / கடலை', category: 'Rabi Pulse', msp_per_quintal: 5440, icon: '🌱', season: 'Rabi', primary_states: ['Madhya Pradesh', 'Rajasthan', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Andhra Pradesh'] },
  { id: 'masur', name: 'Masur (Lentil)', local_name: 'మసూర్ / मसूर / ಮಸೂರ', category: 'Rabi Pulse', msp_per_quintal: 6425, icon: '🌱', season: 'Rabi', primary_states: ['Uttar Pradesh', 'Madhya Pradesh', 'Bihar', 'West Bengal'] },
  // Oilseeds
  { id: 'groundnut', name: 'Groundnut', local_name: 'వేరుశనగ / मूंगफली / ಕಡಲೆಕಾಯಿ / நிலக்கடலை', category: 'Kharif Oilseed', msp_per_quintal: 6783, icon: '🥜', season: 'Kharif', primary_states: ['Gujarat', 'Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Rajasthan'] },
  { id: 'sunflower', name: 'Sunflower', local_name: 'పొద్దుతిరుగుడు / सूरजमुखी / ಸೂರ್ಯಕಾಂತಿ', category: 'Kharif Oilseed', msp_per_quintal: 7280, icon: '🌻', season: 'Kharif', primary_states: ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Haryana'] },
  { id: 'soybean', name: 'Soybean', local_name: 'సోయాబీన్ / सोयाबीन / ಸೋಯಾಬೀನ್', category: 'Kharif Oilseed', msp_per_quintal: 4892, icon: '🫘', season: 'Kharif', primary_states: ['Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Karnataka'] },
  { id: 'mustard', name: 'Mustard (Rapeseed)', local_name: 'ఆవాలు / सरसों / ಸಾಸಿವೆ / கடுகு', category: 'Rabi Oilseed', msp_per_quintal: 5950, icon: '🌿', season: 'Rabi', primary_states: ['Rajasthan', 'Uttar Pradesh', 'Haryana', 'Madhya Pradesh', 'West Bengal'] },
  { id: 'sesame', name: 'Sesame (Til)', local_name: 'నువ్వులు / तिल / ಎಳ್ಳು / எள்', category: 'Kharif Oilseed', msp_per_quintal: 9267, icon: '🌿', season: 'Kharif', primary_states: ['West Bengal', 'Uttar Pradesh', 'Rajasthan', 'Telangana', 'Andhra Pradesh', 'Gujarat'] },
  { id: 'castor', name: 'Castor', local_name: 'ఆముదం / अरंडी / ಆಮಣಕ', category: 'Kharif Oilseed', msp_per_quintal: 6905, icon: '🌿', season: 'Kharif', primary_states: ['Gujarat', 'Andhra Pradesh', 'Telangana', 'Rajasthan', 'Karnataka'] },
  // Commercial Crops
  { id: 'cotton', name: 'Cotton (Medium Staple)', local_name: 'పత్తి / कपास / ಹತ್ತಿ / பருத்தி', category: 'Kharif Commercial', msp_per_quintal: 7121, icon: '☁️', season: 'Kharif', primary_states: ['Gujarat', 'Maharashtra', 'Telangana', 'Andhra Pradesh', 'Karnataka', 'Punjab', 'Haryana', 'Rajasthan', 'Madhya Pradesh'] },
  { id: 'cotton_long', name: 'Cotton (Long Staple)', local_name: 'పత్తి (లాంగ్) / कपास (लंबे रेशे)', category: 'Kharif Commercial', msp_per_quintal: 7521, icon: '☁️', season: 'Kharif', primary_states: ['Gujarat', 'Maharashtra', 'Andhra Pradesh'] },
  { id: 'sugarcane', name: 'Sugarcane', local_name: 'చెరకు / गन्ना / ಕಬ್ಬು / கரும்பு', category: 'Commercial', msp_per_quintal: 340, icon: '🎋', season: 'Annual', primary_states: ['Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Bihar', 'Punjab', 'Haryana'] },
  { id: 'jute', name: 'Jute', local_name: 'జనుము / जूट / পাট', category: 'Kharif Commercial', msp_per_quintal: 5050, icon: '🌿', season: 'Kharif', primary_states: ['West Bengal', 'Bihar', 'Assam', 'Odisha'] },
  { id: 'tobacco', name: 'Tobacco', local_name: 'పొగాకు / तंबाकू / ತಂಬಾಕು', category: 'Commercial', msp_per_quintal: 0, icon: '🌿', season: 'Rabi', primary_states: ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Gujarat', 'Odisha'] },
  // Vegetables & Horticulture (no fixed MSP but supported for procurement)
  { id: 'onion', name: 'Onion', local_name: 'ఉల్లిపాయ / प्याज / ಈರುಳ್ಳಿ / வெங்காயம்', category: 'Horticulture', msp_per_quintal: 0, icon: '🧅', season: 'Rabi', primary_states: ['Maharashtra', 'Madhya Pradesh', 'Karnataka', 'Gujarat', 'Rajasthan', 'Bihar'] },
  { id: 'tomato', name: 'Tomato', local_name: 'టమాటో / टमाटर / ಟೊಮ್ಯಾಟೊ / தக்காளி', category: 'Horticulture', msp_per_quintal: 0, icon: '🍅', season: 'Year-round', primary_states: ['Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Gujarat', 'Odisha'] },
  { id: 'chilli', name: 'Chilli', local_name: 'మిర్చి / मिर्च / ಮೆಣಸಿನಕಾಯಿ / மிளகாய்', category: 'Horticulture', msp_per_quintal: 0, icon: '🌶️', season: 'Kharif', primary_states: ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Maharashtra', 'Rajasthan', 'West Bengal'] },
  { id: 'turmeric', name: 'Turmeric', local_name: 'పసుపు / हल्दी / ಅರಿಶಿನ / மஞ்சள்', category: 'Spice', msp_per_quintal: 0, icon: '🫚', season: 'Kharif', primary_states: ['Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Karnataka', 'Odisha', 'West Bengal'] },
  { id: 'ginger', name: 'Ginger', local_name: 'అల్లం / अदरक / ಶುಂಠಿ / இஞ்சி', category: 'Spice', msp_per_quintal: 0, icon: '🫚', season: 'Kharif', primary_states: ['Kerala', 'Karnataka', 'Odisha', 'Assam', 'West Bengal', 'Arunachal Pradesh'] },
  // Fruits
  { id: 'banana', name: 'Banana', local_name: 'అరటి / केला / ಬಾಳೆ / வாழை', category: 'Fruit', msp_per_quintal: 0, icon: '🍌', season: 'Year-round', primary_states: ['Andhra Pradesh', 'Tamil Nadu', 'Gujarat', 'Maharashtra', 'Karnataka'] },
  { id: 'mango', name: 'Mango', local_name: 'మామిడి / आम / ಮಾವು / மாம்பழம்', category: 'Fruit', msp_per_quintal: 0, icon: '🥭', season: 'Summer', primary_states: ['Uttar Pradesh', 'Andhra Pradesh', 'Telangana', 'Karnataka', 'Bihar', 'Gujarat', 'Tamil Nadu'] },
  { id: 'coconut', name: 'Coconut', local_name: 'కొబ్బరి / नारियल / ತೆಂಗಿನಕಾಯಿ / தேங்காய்', category: 'Fruit', msp_per_quintal: 3275, icon: '🥥', season: 'Year-round', primary_states: ['Kerala', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Goa', 'West Bengal'] },
];

// ── District → State mapping for major agricultural districts ─────────────
const DISTRICT_STATE_MAP: Record<string, string> = {
  'warangal': 'Telangana', 'karimnagar': 'Telangana', 'nalgonda': 'Telangana', 'khammam': 'Telangana',
  'nizamabad': 'Telangana', 'adilabad': 'Telangana', 'hyderabad': 'Telangana', 'medak': 'Telangana',
  'guntur': 'Andhra Pradesh', 'krishna': 'Andhra Pradesh', 'east godavari': 'Andhra Pradesh',
  'west godavari': 'Andhra Pradesh', 'srikakulam': 'Andhra Pradesh', 'vizianagaram': 'Andhra Pradesh',
  'visakhapatnam': 'Andhra Pradesh', 'nellore': 'Andhra Pradesh', 'kurnool': 'Andhra Pradesh',
  'kadapa': 'Andhra Pradesh', 'chittoor': 'Andhra Pradesh', 'prakasam': 'Andhra Pradesh',
  'konaseema': 'Andhra Pradesh', 'kakinada': 'Andhra Pradesh', 'amalapuram': 'Andhra Pradesh',
  'ludhiana': 'Punjab', 'amritsar': 'Punjab', 'jalandhar': 'Punjab', 'patiala': 'Punjab',
  'ambala': 'Haryana', 'karnal': 'Haryana', 'hisar': 'Haryana', 'rohtak': 'Haryana',
  'nagpur': 'Maharashtra', 'pune': 'Maharashtra', 'nashik': 'Maharashtra', 'solapur': 'Maharashtra',
  'belgaum': 'Karnataka', 'mysore': 'Karnataka', 'shimoga': 'Karnataka', 'dharwad': 'Karnataka',
  'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu', 'thanjavur': 'Tamil Nadu', 'tirunelveli': 'Tamil Nadu',
  'palakkad': 'Kerala', 'thrissur': 'Kerala', 'malappuram': 'Kerala', 'wayanad': 'Kerala',
};

// ── Nearby districts for crop discovery ────────────────────────────────────
const NEARBY_DISTRICTS: Record<string, string[]> = {
  'warangal': ['karimnagar', 'khammam', 'nalgonda', 'medak'],
  'guntur': ['krishna', 'prakasam', 'nellore', 'west godavari'],
  'east godavari': ['west godavari', 'konaseema', 'kakinada', 'krishna', 'vizianagaram'],
  'west godavari': ['east godavari', 'krishna', 'guntur'],
  'ludhiana': ['amritsar', 'jalandhar', 'patiala'],
  'nagpur': ['wardha', 'yavatmal', 'bhandara'],
  'belgaum': ['dharwad', 'gadag', 'bidar'],
  'thanjavur': ['tiruvarur', 'nagapattinam', 'pudukottai'],
  'palakkad': ['thrissur', 'malappuram', 'coimbatore'],
};

// ── Get crops relevant to a district + state ──────────────────────────────
export function getCropsForDistrict(district: string, state?: string): Crop[] {
  const districtLower = district.toLowerCase().trim();
  const detectedState = state || DISTRICT_STATE_MAP[districtLower] || '';
  const nearbyDists = NEARBY_DISTRICTS[districtLower] || [];

  // Score each crop by regional relevance
  const scored = INDIA_CROPS.map((crop) => {
    let score = 0;
    if (detectedState && crop.primary_states?.some(s => s.toLowerCase() === detectedState.toLowerCase())) {
      score += 10; // primary state match
    }
    if (crop.primary_districts?.some(d => d.toLowerCase() === districtLower)) {
      score += 5; // exact district match
    }
    if (nearbyDists.some(nd => crop.primary_districts?.some(d => d.toLowerCase() === nd))) {
      score += 3; // nearby district match
    }
    // Include all crops with MSP regardless
    if (crop.msp_per_quintal > 0) score += 1;
    return { crop, score };
  });

  // Sort by score, return all with score > 0, then the rest
  scored.sort((a, b) => b.score - a.score);

  // Always return all crops but sorted by relevance
  return scored.map(s => s.crop);
}

// ── Fetch crops from Supabase with fallback to built-in database ──────────
export async function fetchCropsForLocation(district?: string, state?: string): Promise<Crop[]> {
  // Try Supabase first
  try {
    let query = supabase.from('crops').select('*');
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      // If we have district, filter by relevance from local data (Supabase doesn't have crop_regions yet)
      if (district) {
        const relevant = getCropsForDistrict(district, state);
        const relevantIds = new Set(relevant.map(c => c.id));
        // Merge Supabase data with our local relevance ordering
        const supabaseCrops: Crop[] = data.map(row => ({
          id: row.id,
          name: row.name,
          local_name: row.local_name || '',
          category: row.category,
          msp_per_quintal: row.msp_per_quintal,
          icon: row.icon || '🌾',
        }));
        // Sort by relevance
        return supabaseCrops.sort((a, b) => {
          const aIdx = relevant.findIndex(r => r.id === a.id);
          const bIdx = relevant.findIndex(r => r.id === b.id);
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });
      }
      return data as Crop[];
    }
  } catch {
    // Fall through to local
  }

  // Fallback to comprehensive local data
  if (district) return getCropsForDistrict(district, state);
  return INDIA_CROPS;
}
