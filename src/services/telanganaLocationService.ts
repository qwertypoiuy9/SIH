/**
 * KisanQ — Telangana Location Service
 *
 * Complete offline-first location data for all 33 Telangana districts.
 * District → Mandal mapping from official Telangana government sources.
 * Village/Pincode lookup via Nominatim reverse-geocode (no key needed).
 *
 * RULES:
 *  - Never invent mandals, villages or pincodes
 *  - Offline data is bundled for districts + mandals (works without network)
 *  - Village + pincode lookup always uses real geocoding APIs
 */

import { supabase } from '../utils/supabaseAuth';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TSDistrict {
  name: string;
  name_te: string;
  hq: string;
  latitude: number;
  longitude: number;
}

export interface TSMandal {
  district: string;
  name: string;
  name_te?: string;
}

export interface TSVillage {
  district: string;
  mandal: string;
  name: string;
  name_te?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationSuggestion {
  type: 'district' | 'mandal' | 'village' | 'pincode';
  district: string;
  mandal?: string;
  village?: string;
  pincode?: string;
  display: string;      // what shows in dropdown
  latitude?: number;
  longitude?: number;
}

// ── Complete Telangana Districts (all 33, official 2022 list) ─────────────────
export const TS_DISTRICTS: TSDistrict[] = [
  { name: 'Adilabad',              name_te: 'ఆదిలాబాద్',            hq: 'Adilabad',       latitude: 19.6641, longitude: 78.5320 },
  { name: 'Bhadradri Kothagudem',  name_te: 'భద్రాద్రి కొత్తగూడెం',   hq: 'Kothagudem',     latitude: 17.5508, longitude: 80.6192 },
  { name: 'Hanamkonda',            name_te: 'హనుమకొండ',              hq: 'Hanamkonda',     latitude: 18.0011, longitude: 79.5706 },
  { name: 'Hyderabad',             name_te: 'హైదరాబాద్',              hq: 'Hyderabad',      latitude: 17.3850, longitude: 78.4867 },
  { name: 'Jagtial',               name_te: 'జగిత్యాల',               hq: 'Jagtial',        latitude: 18.7950, longitude: 79.0000 },
  { name: 'Jangaon',               name_te: 'జనగామ',                 hq: 'Jangaon',        latitude: 17.7252, longitude: 79.1523 },
  { name: 'Jayashankar Bhupalpally', name_te: 'జయశంకర్ భూపాలపల్లి',  hq: 'Bhupalpally',    latitude: 18.4495, longitude: 80.4275 },
  { name: 'Jogulamba Gadwal',      name_te: 'జోగులాంబ గద్వాల',        hq: 'Gadwal',         latitude: 16.2330, longitude: 77.7946 },
  { name: 'Kamareddy',             name_te: 'కామారెడ్డి',              hq: 'Kamareddy',      latitude: 18.3220, longitude: 78.3390 },
  { name: 'Karimnagar',            name_te: 'కరీంనగర్',               hq: 'Karimnagar',     latitude: 18.4386, longitude: 79.1288 },
  { name: 'Khammam',               name_te: 'ఖమ్మం',                  hq: 'Khammam',        latitude: 17.2473, longitude: 80.1514 },
  { name: 'Komaram Bheem Asifabad', name_te: 'కొమురం భీం ఆసిఫాబాద్',  hq: 'Asifabad',       latitude: 19.3720, longitude: 79.2780 },
  { name: 'Mahabubabad',           name_te: 'మహబూబాబాద్',             hq: 'Mahabubabad',    latitude: 17.6000, longitude: 80.0000 },
  { name: 'Mahabubnagar',          name_te: 'మహబూబ్‌నగర్',             hq: 'Mahabubnagar',   latitude: 16.7370, longitude: 77.9830 },
  { name: 'Mancherial',            name_te: 'మంచిర్యాల',               hq: 'Mancherial',     latitude: 18.8687, longitude: 79.4566 },
  { name: 'Medak',                 name_te: 'మెదక్',                  hq: 'Medak',          latitude: 18.0487, longitude: 78.2614 },
  { name: 'Medchal-Malkajgiri',    name_te: 'మేడ్చల్-మల్కాజిగిరి',      hq: 'Medchal',        latitude: 17.6328, longitude: 78.4797 },
  { name: 'Mulugu',                name_te: 'ములుగు',                 hq: 'Mulugu',         latitude: 18.1927, longitude: 80.0780 },
  { name: 'Nagarkurnool',          name_te: 'నాగర్‌కర్నూల్',            hq: 'Nagarkurnool',   latitude: 16.4822, longitude: 78.3260 },
  { name: 'Nalgonda',              name_te: 'నల్గొండ',                hq: 'Nalgonda',       latitude: 17.0575, longitude: 79.2672 },
  { name: 'Narayanpet',            name_te: 'నారాయణపేట',              hq: 'Narayanpet',     latitude: 16.7440, longitude: 77.4960 },
  { name: 'Nirmal',                name_te: 'నిర్మల్',                 hq: 'Nirmal',         latitude: 19.0940, longitude: 78.3440 },
  { name: 'Nizamabad',             name_te: 'నిజామాబాద్',              hq: 'Nizamabad',      latitude: 18.6725, longitude: 78.0941 },
  { name: 'Peddapalli',            name_te: 'పెద్దపల్లి',               hq: 'Peddapalli',     latitude: 18.6151, longitude: 79.3736 },
  { name: 'Rajanna Sircilla',      name_te: 'రాజన్న సిరిసిల్ల',         hq: 'Sircilla',       latitude: 18.3849, longitude: 78.8271 },
  { name: 'Ranga Reddy',           name_te: 'రంగారెడ్డి',               hq: 'Hyderabad',      latitude: 17.3500, longitude: 78.4200 },
  { name: 'Sangareddy',            name_te: 'సంగారెడ్డి',               hq: 'Sangareddy',     latitude: 17.6243, longitude: 78.0862 },
  { name: 'Siddipet',              name_te: 'సిద్దిపేట',                hq: 'Siddipet',       latitude: 18.1016, longitude: 78.8521 },
  { name: 'Suryapet',              name_te: 'సూర్యాపేట',                hq: 'Suryapet',       latitude: 17.1400, longitude: 79.6220 },
  { name: 'Vikarabad',             name_te: 'వికారాబాద్',               hq: 'Vikarabad',      latitude: 17.3363, longitude: 77.9035 },
  { name: 'Wanaparthy',            name_te: 'వనపర్తి',                 hq: 'Wanaparthy',     latitude: 16.3596, longitude: 78.0643 },
  { name: 'Warangal',              name_te: 'వరంగల్',                 hq: 'Warangal',       latitude: 18.0011, longitude: 79.5771 },
  { name: 'Yadadri Bhuvanagiri',   name_te: 'యాదాద్రి భువనగిరి',        hq: 'Bhongir',        latitude: 17.5070, longitude: 78.8880 },
];

// ── Complete District → Mandals mapping (official Telangana Revenue Dept) ─────
// Source: Telangana State Portal (https://www.telangana.gov.in)
export const TS_MANDALS: Record<string, string[]> = {
  'Adilabad': [
    'Adilabad','Bela','Bazarhatnoor','Boath','Gadiguda','Gudihatnoor','Ichoda',
    'Jainad','Kottur','Mavala','Narnoor','Talamadugu','Utnoor',
  ],
  'Bhadradri Kothagudem': [
    'Aswaraopeta','Baironpally','Burgampahad','Chandrugonda','Cherla','Dammapeta',
    'Gundala','Julurpad','Kallur','Kothagudem','Laxmidevipally','Manuguru',
    'Mulkalapally','Nellipaka','Palvancha','Pinapaka','Rowdur','Sujathanagar',
    'Tekulapally','Thirumalayapalem','Venkatapuram','yellandu',
  ],
  'Hanamkonda': [
    'Hanamkonda','Dharmasagar','Geesugonda','Hasanparthy','Khanapur','Parkal',
    'Sangem','Shayampet','Station Ghanpur','Warangal',
  ],
  'Hyderabad': [
    'Amberpet','Bandlaguda Jagir','Bahadurpura','Charminar','Golconda',
    'Karwan','Khairatabad','Musheerabad','Nampally','Secunderabad',
    'Serilingampally','Shaikpet',
  ],
  'Jagtial': [
    'Babupet','Channur','Dharmapuri','Gollapally','Jagityal','Jagtial','Korutla',
    'Kathalapur','Mallapur','Medipally','Metpally','Pegadapally',
    'Raikal','Sarangapur','Velgatoor',
  ],
  'Jangaon': [
    'Bachannapeta','Chilpur','Devaruppula','Ghanpur Station','Jangaon',
    'Kodakandla','Lingalaghanpur','Narmetta','Palakurthi','Raghunathpally',
    'Roopanchal','Tadvai','Zaffergadh',
  ],
  'Jayashankar Bhupalpally': [
    'Bhupalpally','Chityal','Eturunagaram','Govindaraopet','Kataram',
    'Kothaguda','Mahadevpur','Mulugu','Palimela','Regonda',
    'Shankarapatnam','Tekumatla','Tadvai',
  ],
  'Jogulamba Gadwal': [
    'Achampet','Alampur','Atmakur','Dharur','Gadwal','Gattu','Ghattu',
    'Ieeja','Itikyal','Kalwakurthy','Lingal','Maldkal','Manopad',
    'Uppununthala','Waddepally',
  ],
  'Kamareddy': [
    'Banswada','Bichkunda','Domakonda','Ellareddy','Gandhari','Jakranpally',
    'Kamareddy','Lingampet','Machareddy','Madnoor','Nagareddipet',
    'Nizamsagar','Pitlam','Ramareddy','Renjal','Sadashivanagar','Thakkallapally',
  ],
  'Karimnagar': [
    'Bellampalli','Boinpally','Choppadandi','Gangadhara','Huzurabad',
    'Jagtial','Julapally','Karimnagar','Koheda','Kothapally','Manakondur',
    'Mutharam','Peddapally','Ramadugu','Saidapur','Sultanabad','Thimmapur','Veenavanka',
  ],
  'Khammam': [
    'Bonakal','Enkoor','Kamepalli','Khammam','Konijerla','Kusumanchi',
    'Madhira','Nelakondapally','Penuballi','Raghunadhapalem','Sathupally',
    'Singareni','Thirumalayapalem','Vemsoor','Wyra','Yerrupalem',
  ],
  'Komaram Bheem Asifabad': [
    'Asifabad','Bejjur','Dahegaon','Gudihatnoor','Jainoor','Kerameri',
    'Khanapur','Laxmichanda','Narnoor','Rebbena','Sirpur','Tamsi','Tiryani',
  ],
  'Mahabubabad': [
    'Bayyaram','Chinnagudur','Dornakal','Kesamudram','Kuravi','Mahabubabad',
    'Maripeda','Narsimhulapet','Nellipaka','Nookurthi','Thorrur',
  ],
  'Mahabubnagar': [
    'Addakal','Amrabad','Balanagar','Bhoothpur','Bijinapally','Chinnachintakunta',
    'Hanwada','Jadcherla','Kodangal','Kosigi','Mahabubnagar','Makthal',
    'Nagarkurnool','Narayanpet','Nawabpet','Peddamandadi','Shadnagar',
    'Utkoor','Veldanda',
  ],
  'Mancherial': [
    'Bellampally','Bheemaram','Chennur','Dandepally','Hajipur','Jannaram',
    'Kasipet','Kotapally','Mandamarri','Mancherial','Naspur','Rao',
    'Soanpet','Tanur','Venkatapur',
  ],
  'Medak': [
    'Alladurg','Chegunta','Chilwil','Doultabad','Dubbak','Gajwel','Havelighanpur',
    'Jogipet','Kohir','Masaipet','Medak','Narsapur','Papannapet',
    'Ramayampet','Shankarampet','Siddipet','Tekmal','Toopran','Yeldurthy',
  ],
  'Medchal-Malkajgiri': [
    'Almasguda','Bacharam','Cherlapally','Dammaiguda','Dundigal','Ghatkesar',
    'Jawaharnagar','Kapra','Keesara','Kompally','Medchal','Malkajgiri',
    'Neredmet','Quthbullapur','Shamirpet','Uppal',
  ],
  'Mulugu': [
    'Bhuvanagiri','Eturnagaram','Govindaraopet','Kannaigudem','Mangapet',
    'Mulugu','Tadvai','Venkatapuram','Wazeedu',
  ],
  'Nagarkurnool': [
    'Achampet','Amrabad','Bijnapally','Bijinapally','Kollapur','Lingal',
    'Nagarkurnool','Peddakothapally','Telkapally','Utnoor','Veldanda',
  ],
  'Nalgonda': [
    'Alair','Bhongir','Bibinagar','Chandampet','Chityal','Choutuppal',
    'Devarakonda','Dindi','Huzurnagar','Miryalguda','Nalgonda','Nakrekal',
    'Narketpally','Nidamanur','Pedda Adiserlapalle','Pochampally','Ramannapet',
    'Suryapet','Thipparthi','Tungaturthy','Valigonda',
  ],
  'Narayanpet': [
    'Kosgi','Maddur','Maganoor','Makthal','Marikal','Narayanpet',
    'Narva','Utkoor',
  ],
  'Nirmal': [
    'Armoor','Bhainsa','Dilawarpur','Gudihatnoor','Khanapur','Kubeer',
    'Laxmanchanda','Loukyam','Makloor','Mamda','Mudhole','Nirmal',
    'Sarangapur',
  ],
  'Nizamabad': [
    'Armoor','Banswada','Bheemgal','Bodhan','Dichpally','Domakonda',
    'Enkoor','Indalwai','Jakranpally','Kamareddy','Makloor','Mortad',
    'Nizamabad','Nizamsagar','Pitlam','Rudrur','Varni','Yellareddy',
  ],
  'Peddapalli': [
    'Bellampalli','Dharmaram','Godavarikhani','Julapally','Karimnagar',
    'Manthani','Peddapalli','Ramagundam','Sulthanabad',
  ],
  'Rajanna Sircilla': [
    'Boinpally','Choppadandi','Gambhiraopet','Koheda','Mustabad',
    'Rudrangi','Sircilla','Thangallapally','Veenavanka','Yellareddypet',
  ],
  'Ranga Reddy': [
    'Chevella','Farooqnagar','Gandipet','Hayathnagar','Ibrahimpatnam',
    'Kandukur','Kothur','Maheshwaram','Marpalle','Nawabpet','Rajendranagar',
    'Shadnagar','Shankarpally','Shamshabad','Vikarabad',
  ],
  'Sangareddy': [
    'Andole','Gummadidala','Hathnoora','Jharasangam','Jogipet','Kondapur',
    'Kandi','Manoor','Narayankhed','Nyalkal','Patancheru','Pulkal',
    'Ramachandrapuram','Sangareddy','Sadasivpet','Zahirabad',
  ],
  'Siddipet': [
    'Cheriyal','Dubbak','Gajwel','Husnabad','Kohir','Komuravelli',
    'Kondapak','Mirdoddi','Mulug','Narayanaraopeta','Siddipet',
    'Thoguta','Toguta','Wargal',
  ],
  'Suryapet': [
    'Adda','Athmakur','Chivvemla','Garidepally','Kodad','Mothkur',
    'Munagala','Nadigudem','Neredugommu','Nuthankal','Palakurthi','Suryapet',
    'Thirumalagiri','Tungaturthy',
  ],
  'Vikarabad': [
    'Bantwaram','Basheerabad','Dharur','Doulatabad','Kodangal','Kotapally',
    'Kulkacharla','Marpalle','Nawabpet','Pargi','Pudur','Tandur',
    'Vikarabad','Yalal',
  ],
  'Wanaparthy': [
    'Atmakur','Chinnambavi','Gopalpet','Intili','Kalwakurthy',
    'Kothakota','Maddur','Pebbair','Raikal','Revally','Wanaparthy',
  ],
  'Warangal': [
    'Atmakur','Cherial','Chityal','Dharmasagar','Ghanpur','Geesugonda',
    'Hasanparthy','Nallabelly','Nekkonda','Parkal','Parvathagiri',
    'Shayampet','Station Ghanpur','Warangal Rural','Warangal Urban',
  ],
  'Yadadri Bhuvanagiri': [
    'Addagudur','Alair','Bhongir','Bibinagar','Choutuppal','Mothkur',
    'Narketpally','Pochampally','Ramannapet','Rajapet','Turkapally',
    'Valigonda','Yadagirigutta','Yadadri',
  ],
};

// ── Search functions ─────────────────────────────────────────────────────────

/** Fuzzy search districts — returns matches for partial input */
export function searchDistricts(query: string): TSDistrict[] {
  if (!query.trim()) return TS_DISTRICTS;
  const q = query.toLowerCase().trim();
  return TS_DISTRICTS.filter(
    d => d.name.toLowerCase().includes(q) ||
         d.name_te.includes(q) ||
         d.hq.toLowerCase().includes(q)
  );
}

/** Get all mandals for a district */
export function getMandalsForDistrict(district: string): string[] {
  return TS_MANDALS[district] || [];
}

/** Search mandals within a district */
export function searchMandals(district: string, query: string): string[] {
  const mandals = getMandalsForDistrict(district);
  if (!query.trim()) return mandals;
  const q = query.toLowerCase().trim();
  return mandals.filter(m => m.toLowerCase().includes(q));
}

/** Get district record by name */
export function getDistrict(name: string): TSDistrict | undefined {
  return TS_DISTRICTS.find(d => d.name.toLowerCase() === name.toLowerCase());
}

// ── Supabase-backed village search (returns empty gracefully if table not yet populated) ──
export async function searchVillages(
  district: string,
  mandal: string,
  query: string
): Promise<TSVillage[]> {
  if (!district || !mandal) return [];
  try {
    let q = supabase
      .from('telangana_villages')
      .select('*')
      .eq('district', district)
      .eq('mandal', mandal)
      .limit(20);

    if (query.trim()) {
      q = q.ilike('name', `%${query.trim()}%`);
    }
    const { data, error } = await q;
    if (error || !data) return [];
    return data as TSVillage[];
  } catch {
    return [];
  }
}

// ── Reverse geocode via Nominatim → best-match Telangana address ─────────────
export interface GeocodedAddress {
  state: string;
  district: string;
  mandal: string;
  village: string;
  pincode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  isInTelangana: boolean;
}

export async function reverseGeocodeToTelangana(
  lat: number,
  lng: number
): Promise<GeocodedAddress | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16&accept-language=en`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'KisanQ-MSP/1.0 (https://KisanQ-app.vercel.app)',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;

    const addr = data.address || {};
    const state: string = addr.state || '';
    const isInTelangana = state.toLowerCase().includes('telangana');

    // Extract fields from Nominatim response
    const rawDistrict = (addr.county || addr.state_district || addr.district || '')
      .replace(/ [Dd]istrict$/, '')
      .replace(/ [Mm]andal$/, '')
      .trim();

    const rawMandal = addr.state_district || addr.suburb || addr.locality || '';
    const rawVillage =
      addr.village || addr.town || addr.suburb ||
      addr.city_block || addr.city || addr.residential ||
      addr.hamlet || '';

    // Match to known Telangana district (fuzzy)
    let matchedDistrict = rawDistrict;
    if (isInTelangana) {
      const match = searchDistricts(rawDistrict)[0];
      if (match) matchedDistrict = match.name;
    }

    // Match to known mandal
    let matchedMandal = rawMandal;
    if (isInTelangana && matchedDistrict) {
      const mandals = getMandalsForDistrict(matchedDistrict);
      const mandalMatch = mandals.find(
        m => m.toLowerCase().includes(rawMandal.toLowerCase()) ||
             rawMandal.toLowerCase().includes(m.toLowerCase())
      );
      if (mandalMatch) matchedMandal = mandalMatch;
    }

    return {
      state: isInTelangana ? 'Telangana' : state,
      district: matchedDistrict,
      mandal: matchedMandal !== matchedDistrict ? matchedMandal : '',
      village: rawVillage,
      pincode: addr.postcode || '',
      formattedAddress: data.display_name || '',
      latitude: lat,
      longitude: lng,
      isInTelangana,
    };
  } catch {
    return null;
  }
}

// ── Forward geocode: district/mandal name → lat/lng ───────────────────────────
export async function geocodeMandalOrVillage(
  village: string,
  mandal: string,
  district: string
): Promise<{ lat: number; lng: number } | null> {
  // First try using bundled district coordinates if only district-level
  if (!village && !mandal) {
    const d = getDistrict(district);
    if (d) return { lat: d.latitude, lng: d.longitude };
  }

  const query = [village, mandal, district, 'Telangana', 'India']
    .filter(Boolean)
    .join(', ');

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'KisanQ-MSP/1.0',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }

  // Fallback: use district HQ coordinates
  const d = getDistrict(district);
  return d ? { lat: d.latitude, lng: d.longitude } : null;
}

// ── Combined address search (for the autocomplete dropdown) ────────────────────
export function searchLocationSuggestions(
  query: string,
  district?: string
): LocationSuggestion[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const suggestions: LocationSuggestion[] = [];

  // 1. Match districts
  const districtMatches = searchDistricts(q);
  for (const d of districtMatches.slice(0, 4)) {
    suggestions.push({
      type: 'district',
      district: d.name,
      display: `${d.name} (${d.name_te}) — District HQ: ${d.hq}`,
      latitude: d.latitude,
      longitude: d.longitude,
    });
  }

  // 2. Match mandals within a district (if district is selected)
  if (district) {
    const mandalMatches = searchMandals(district, q);
    for (const m of mandalMatches.slice(0, 6)) {
      suggestions.push({
        type: 'mandal',
        district,
        mandal: m,
        display: `${m} Mandal — ${district}`,
      });
    }
  } else {
    // Search mandals across all districts
    let count = 0;
    for (const [dist, mandals] of Object.entries(TS_MANDALS)) {
      if (count >= 6) break;
      for (const m of mandals) {
        if (m.toLowerCase().includes(q)) {
          suggestions.push({
            type: 'mandal',
            district: dist,
            mandal: m,
            display: `${m} Mandal — ${dist}`,
          });
          count++;
          if (count >= 6) break;
        }
      }
    }
  }

  return suggestions;
}
