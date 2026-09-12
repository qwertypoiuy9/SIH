import React, { useState, useEffect, useCallback } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import { fetchWeather, fetchWeatherByLocation } from '../../services/weatherService';
import { WeatherData } from '../../types';
import {
  Cloud, Droplets, Wind, Eye, Thermometer, AlertTriangle, Loader2,
  RefreshCw, MapPin, Sun, CloudRain, Zap, Snowflake,
} from 'lucide-react';

const OWM_KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_OPENWEATHER_KEY || '';

// ── Map condition string to an icon ──────────────────────────────────────
function WeatherIcon({ condition, size = 'md' }: { condition: string; size?: 'sm' | 'md' | 'lg' }) {
  const lc = condition.toLowerCase();
  const cls = size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-6 h-6' : 'w-4 h-4';
  if (lc.includes('thunder')) return <Zap className={`${cls} text-yellow-500`} />;
  if (lc.includes('snow')) return <Snowflake className={`${cls} text-blue-300`} />;
  if (lc.includes('rain') || lc.includes('drizzle') || lc.includes('shower')) return <CloudRain className={`${cls} text-blue-500`} />;
  if (lc.includes('cloud') || lc.includes('overcast') || lc.includes('mist') || lc.includes('fog')) return <Cloud className={`${cls} text-stone-400`} />;
  return <Sun className={`${cls} text-amber-400`} />;
}

const SEVERITY_COLORS = {
  minor: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  moderate: 'border-amber-400 bg-amber-50 text-amber-900',
  severe: 'border-orange-500 bg-orange-50 text-orange-900',
  extreme: 'border-red-600 bg-red-50 text-red-900',
};

export const WeatherDashboard: React.FC = () => {
  const { authSession, language } = useKisanFlow();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLabel, setLocationLabel] = useState('');

  const profile = authSession.user;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (profile?.latitude && profile?.longitude) {
        const label = [profile.village, profile.mandal, profile.district, profile.state].filter(Boolean).join(', ');
        setLocationLabel(label || 'Your Location');
        const data = await fetchWeather(profile.latitude, profile.longitude, label, language);
        setWeather(data);
      } else if (profile?.district) {
        const label = [profile.district, profile.state].filter(Boolean).join(', ');
        setLocationLabel(label);
        const data = await fetchWeatherByLocation(label, language);
        setWeather(data);
      } else {
        setError('Location not set in your profile. Please update your address to see weather information.');
      }
    } catch {
      setError('Weather information is temporarily unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile, language]);

  useEffect(() => { load(); }, [load]);

  if (!OWM_KEY) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-6">
          <h2 className="text-lg font-black text-amber-900 mb-2">🌦️ Weather & Alerts</h2>
          <p className="text-sm text-amber-800">
            Weather integration requires an OpenWeatherMap API key. Add{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">VITE_OPENWEATHER_KEY</code>{' '}
            to your <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code> file.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Free tier at <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="underline">openweathermap.org</a> — 1,000 calls/day.
          </p>
          {profile?.district && (
            <div className="mt-4 p-4 bg-white rounded-2xl border border-amber-200">
              <p className="text-xs font-bold text-amber-800 mb-1">📍 Your saved location:</p>
              <p className="text-sm font-bold text-stone-900">{[profile.village, profile.mandal, profile.district, profile.state].filter(Boolean).join(', ')}</p>
              <p className="text-xs text-stone-500 mt-1">Weather will load here once the API key is configured.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">🌦️ Weather & Alerts</h2>
          {locationLabel && (
            <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {locationLabel}
            </p>
          )}
        </div>
        <button onClick={load} disabled={loading} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Getting weather for your location...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-300 rounded-3xl p-5">
          <p className="text-sm text-red-800 font-semibold">⚠️ {error}</p>
        </div>
      )}

      {weather && !loading && (
        <>
          {/* Fallback notice */}
          {weather.source === 'fallback' && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-800 font-semibold">
              ⚠️ Live weather data is temporarily unavailable.
            </div>
          )}

          {/* Severe Weather Alerts */}
          {weather.alerts.length > 0 && (
            <div className="space-y-3">
              {weather.alerts.map((alert, i) => (
                <div key={i} className={`rounded-3xl p-5 border-2 ${SEVERITY_COLORS[alert.severity]}`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-sm">{alert.event}</p>
                      <p className="text-xs mt-1 leading-relaxed">{alert.description.slice(0, 200)}{alert.description.length > 200 ? '...' : ''}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {weather.alerts.length === 0 && weather.source !== 'fallback' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              ✓ No severe weather alerts currently reported for your area.
            </div>
          )}

          {/* Current Weather Card */}
          {weather.current.temp_c !== 0 && (
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl p-6 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Current Conditions</p>
                  <p className="text-xs text-blue-200 mt-0.5">{weather.current.location}</p>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-6xl font-black">{weather.current.temp_c}°C</span>
                  </div>
                  <p className="text-sm text-blue-200 mt-1 capitalize">{weather.current.condition}</p>
                  <p className="text-xs text-blue-300">Feels like {weather.current.feels_like_c}°C</p>
                </div>
                <div className="text-right">
                  <WeatherIcon condition={weather.current.condition} size="lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/20">
                {[
                  { icon: <Droplets className="w-4 h-4 text-blue-300" />, label: 'Humidity', value: `${weather.current.humidity}%` },
                  { icon: <Wind className="w-4 h-4 text-blue-300" />, label: 'Wind', value: `${weather.current.wind_kph} km/h` },
                  { icon: <CloudRain className="w-4 h-4 text-blue-300" />, label: 'Rain', value: `${weather.current.rain_mm || 0} mm` },
                  { icon: <Eye className="w-4 h-4 text-blue-300" />, label: 'Visibility', value: `${weather.current.visibility_km || '--'} km` },
                ].map((s, i) => (
                  <div key={i} className="bg-white/10 rounded-2xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-[10px] text-blue-300 uppercase font-bold">{s.label}</span></div>
                    <p className="text-base font-black">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Farmer Advisory */}
          {weather.farmer_advisory && (
            <div className="bg-emerald-900 text-white rounded-3xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌾</span>
                <p className="font-black text-sm">Farmer Advisory</p>
              </div>
              <p className="text-sm text-emerald-100 leading-relaxed">{weather.farmer_advisory}</p>
            </div>
          )}

          {/* 5-Day Forecast */}
          {weather.forecast.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
              <h3 className="font-bold text-sm text-stone-900 mb-4">5-Day Forecast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {weather.forecast.map((day, i) => (
                  <div key={i} className="bg-stone-50 rounded-2xl p-3 text-center border border-stone-200">
                    <p className="text-[10px] font-bold text-stone-500 uppercase">{day.date}</p>
                    <div className="flex justify-center my-2">
                      <WeatherIcon condition={day.condition} size="sm" />
                    </div>
                    <p className="text-xs font-black text-stone-900">{day.max_temp_c}° <span className="text-stone-400 font-normal">{day.min_temp_c}°</span></p>
                    <p className="text-[10px] text-blue-700 font-bold mt-1">💧 {day.rain_probability}%</p>
                    {day.rain_mm > 0 && <p className="text-[10px] text-stone-500">{day.rain_mm}mm</p>}
                    <p className="text-[10px] text-stone-400 capitalize mt-1 leading-tight">{day.condition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
