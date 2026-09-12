/**
 * KisanQ Weather Service
 * Uses OpenWeatherMap One Call API 3.0 (free tier: 1,000 calls/day)
 * Falls back gracefully if key is missing or API fails.
 */
import { WeatherData, WeatherCurrent, WeatherForecastDay, WeatherAlert, LanguageCode } from '../types';

const OWM_KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_OPENWEATHER_KEY || '';

// ── Haversine distance in km between two lat/lng points ────────────────────
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Farmer advisory generator using weather data ─────────────────────────
function generateFarmerAdvisory(
  condition: string,
  rainMm: number,
  windKph: number,
  tempC: number,
  lang: LanguageCode = 'en'
): string {
  const lc = condition.toLowerCase();
  const isRain = lc.includes('rain') || lc.includes('drizzle') || lc.includes('shower') || rainMm > 5;
  const isThunder = lc.includes('thunder') || lc.includes('storm');
  const isHotDay = tempC > 38;
  const isColdDay = tempC < 10;
  const isWindy = windKph > 40;

  const advisories: Record<string, Record<LanguageCode, string>> = {
    thunder: {
      te: 'ఉరుముల వర్షం వస్తుంది. పొలంలో పని ఆపి సురక్షిత స్థలానికి వెళ్ళండి. కొనుగోలు కేంద్రానికి ప్రయాణాన్ని వాయిదా వేయండి.',
      hi: 'तूफान की संभावना है। खेत में काम बंद करें और सुरक्षित स्थान पर जाएं। आज केंद्र जाने से बचें।',
      en: 'Thunderstorm expected. Stop outdoor work and take shelter. Consider postponing your procurement center visit.',
      kn: 'ಗುಡುಗು ಮಳೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ಹೊಲದ ಕೆಲಸ ನಿಲ್ಲಿಸಿ ಸುರಕ್ಷಿತ ಸ್ಥಳದಲ್ಲಿ ಆಶ್ರಯ ಪಡೆಯಿರಿ.',
      ta: 'இடியுடன் மழை எதிர்பார்க்கப்படுகிறது. வெளி வேலைகளை நிறுத்தவும்.',
      bn: 'বজ্রঝড়ের সম্ভাবনা আছে। মাঠের কাজ বন্ধ রাখুন।',



    },
    rain: {
      te: 'భారీ వర్షం పడే అవకాశం ఉంది. కోసిన వరిని తడవకుండా కప్పి ఉంచండి. తేమ 17% పైన ఉంటే నాణ్యత పరీక్షలో తిరస్కరించబడవచ్చు.',
      hi: 'भारी बारिश की संभावना है। काटी गई फसल को ढककर रखें। अधिक नमी से MSP खरीद में कठिनाई हो सकती है।',
      en: 'Heavy rainfall expected. Keep harvested produce covered to avoid moisture absorption. Moisture above 17% may result in quality rejection.',
      kn: 'ಭಾರೀ ಮಳೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ಕಟಾವು ಮಾಡಿದ ಬೆಳೆಯನ್ನು ಮುಚ್ಚಿ ಇಡಿ.',
      ta: 'கனமழை எதிர்பார்க்கப்படுகிறது. அறுவடை செய்த தானியங்களை மூடி வைக்கவும்.',
      bn: 'ভারী বৃষ্টি আশা করা হচ্ছে। কাটা ফসল ঢেকে রাখুন।',



    },
    hot: {
      te: 'అధిక వేడిమి ఉంది. నీడలో పని చేయండి. మంచినీళ్ళు తాగుతూ ఉండండి. ధాన్యాన్ని నేరుగా ఎండలో ఉంచవద్దు.',
      hi: 'तेज गर्मी है। छाया में काम करें। धान को सीधी धूप में न रखें और अच्छी तरह ढककर रखें।',
      en: 'Extreme heat today. Work in shade, stay hydrated. Do not leave harvested grain exposed to direct sunlight.',
      kn: 'ತೀವ್ರ ಶಾಖ ಇದೆ. ನೆರಳಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡಿ. ಧಾನ್ಯವನ್ನು ನೇರ ಬಿಸಿಲಿನಲ್ಲಿ ಬಿಡಬೇಡಿ.',
      ta: 'கடுமையான வெப்பம். நிழலில் வேலை செய்யவும். நீர் அதிகமாக குடிக்கவும்.',
      bn: 'প্রচণ্ড গরম। ছায়ায় কাজ করুন। ধান সরাসরি রোদে রাখবেন না।',



    },
    wind: {
      te: 'బలమైన గాలులు ఉంటాయి. తాత్కాలిక నిర్మాణాలు గట్టిగా కట్టండి. ట్రాక్టర్ ట్రాలీలో ధాన్యాన్ని సరిగ్గా కట్టుకోండి.',
      hi: 'तेज हवाएं चलेंगी। ट्रैक्टर ट्रॉली में धान को ढककर बांधें। तिरपाल सुरक्षित करें।',
      en: 'Strong winds expected. Secure tarpaulins and temporary structures. Cover grain in tractor trolleys.',
      kn: 'ತೀವ್ರ ಗಾಳಿ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ. ತಾತ್ಕಾಲಿಕ ರಚನೆಗಳನ್ನು ಭದ್ರಪಡಿಸಿ.',
      ta: 'வலிமையான காற்று எதிர்பார்க்கப்படுகிறது. தார்ப்பாய்களை பாதுகாப்பாக கட்டுங்கள்.',
      bn: 'ঝড়ো বাতাস হবে। ট্রলিতে ধান ঢেকে রাখুন।',



    },
    clear: {
      te: 'ఈ రోజు వాతావరణం అనుకూలంగా ఉంది. కొనుగోలు కేంద్రానికి వెళ్ళడానికి మంచి రోజు.',
      hi: 'आज मौसम अनुकूल है। आज खरीद केंद्र जाने के लिए अच्छा दिन है।',
      en: 'Clear weather today. Good day to visit the procurement center. Keep produce covered during transport.',
      kn: 'ಇಂದು ಹವಾಮಾನ ಅನುಕೂಲಕರವಾಗಿದೆ. ಖರೀದಿ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಲು ಉತ್ತಮ ದಿನ.',
      ta: 'இன்று வானிலை சாதகமாக உள்ளது. கொள்முதல் மையத்திற்கு செல்ல நல்ல நாள்.',
      bn: 'আজ আবহাওয়া অনুকূল। ক্রয় কেন্দ্রে যাওয়ার জন্য ভালো দিন।',



    },
  };

  const l = lang as LanguageCode;
  if (isThunder) return advisories.thunder[l] || advisories.thunder.en;
  if (isRain) return advisories.rain[l] || advisories.rain.en;
  if (isHotDay) return advisories.hot[l] || advisories.hot.en;
  if (isWindy) return advisories.wind[l] || advisories.wind.en;
  return advisories.clear[l] || advisories.clear.en;
}

// ── Main weather fetch ────────────────────────────────────────────────────
export async function fetchWeather(
  lat: number,
  lng: number,
  locationLabel: string,
  lang: LanguageCode = 'en'
): Promise<WeatherData> {
  if (!OWM_KEY) {
    return buildFallback(locationLabel, lang);
  }

  try {
    // Use OpenWeatherMap One Call 3.0
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly&appid=${OWM_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OWM ${res.status}`);
    const d = await res.json();

    const current: WeatherCurrent = {
      temp_c: Math.round(d.current.temp),
      feels_like_c: Math.round(d.current.feels_like),
      humidity: d.current.humidity,
      wind_kph: Math.round((d.current.wind_speed || 0) * 3.6),
      condition: d.current.weather[0]?.description || '',
      condition_icon: `https://openweathermap.org/img/wn/${d.current.weather[0]?.icon}@2x.png`,
      rain_mm: d.current.rain?.['1h'] || 0,
      uv_index: d.current.uvi,
      visibility_km: Math.round((d.current.visibility || 10000) / 1000),
      location: locationLabel,
      dt: d.current.dt,
    };

    const forecast: WeatherForecastDay[] = (d.daily || []).slice(0, 5).map((day: Record<string, unknown>) => {
      const weather = (day.weather as Array<{ description: string; icon: string }>)?.[0];
      const pop = day.pop as number;
      const rain = day.rain as number | undefined;
      const temp = day.temp as { max: number; min: number };
      const wind_speed = day.wind_speed as number;
      const humidity = day.humidity as number;
      const dt = day.dt as number;
      return {
        date: new Date(dt * 1000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        max_temp_c: Math.round(temp.max),
        min_temp_c: Math.round(temp.min),
        condition: weather?.description || '',
        condition_icon: `https://openweathermap.org/img/wn/${weather?.icon}@2x.png`,
        rain_probability: Math.round((pop || 0) * 100),
        rain_mm: Math.round((rain || 0) * 10) / 10,
        wind_kph: Math.round((wind_speed || 0) * 3.6),
        humidity: humidity,
      };
    });

    const alerts: WeatherAlert[] = (d.alerts || []).map((a: Record<string, unknown>) => ({
      event: a.event as string,
      description: a.description as string,
      severity: 'moderate' as const,
      start: a.start as number,
      end: a.end as number,
    }));

    const advisory = generateFarmerAdvisory(
      current.condition,
      current.rain_mm || 0,
      current.wind_kph,
      current.temp_c,
      lang
    );

    return { current, forecast, alerts, farmer_advisory: advisory, source: 'openweather' };
  } catch (err) {
    console.warn('[Weather] API failed, using fallback:', err);
    return buildFallback(locationLabel, lang);
  }
}

// ── Geocode a location name and fetch weather ────────────────────────────
export async function fetchWeatherByLocation(
  location: string,
  lang: LanguageCode = 'en'
): Promise<WeatherData> {
  if (!OWM_KEY) return buildFallback(location, lang);
  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)},IN&limit=1&appid=${OWM_KEY}`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error('Geo failed');
    const geoData = await geoRes.json();
    if (!geoData || !geoData[0]) return buildFallback(location, lang);
    return fetchWeather(geoData[0].lat, geoData[0].lon, location, lang);
  } catch {
    return buildFallback(location, lang);
  }
}

function buildFallback(location: string, lang: LanguageCode): WeatherData {
  const fallbackAdvisory: Record<LanguageCode, string> = {
    en: 'Weather information is temporarily unavailable. Please check a local weather source before visiting the procurement center.',
    te: 'వాతావరణ సమాచారం అందుబాటులో లేదు. కొనుగోలు కేంद్రానికి వెళ్ళే ముందు స్థానిక వాతావరణ వివరాలు తనిఖీ చేయండి.',
    hi: 'मौसम जानकारी अस्थायी रूप से अनुपलब्ध है। खरीद केंद्र जाने से पहले स्थानीय मौसम जांचें।',
    kn: 'ಹವಾಮಾನ ಮಾಹಿತಿ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.',
    ta: 'வானிலை தகவல் தற்காலிகமாக கிடைக்கவில்லை.',
    bn: 'আবহাওয়ার তথ্য সাময়িকভাবে অনুপলব্ধ।',



  };

  return {
    current: {
      temp_c: 0,
      feels_like_c: 0,
      humidity: 0,
      wind_kph: 0,
      condition: 'Unavailable',
      condition_icon: '',
      rain_mm: 0,
      location,
      dt: Date.now() / 1000,
    },
    forecast: [],
    alerts: [],
    farmer_advisory: fallbackAdvisory[lang] || fallbackAdvisory.en,
    source: 'fallback',
  };
}
