/**
 * LocationAutocomplete — Smart Telangana address picker
 *
 * Renders a GPS button + cascading District → Mandal → Village → Pincode
 * fields with autocomplete. All data is real (no invented locations).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Navigation, Loader2, CheckCircle2, ChevronDown,
  X, Search, MapPin,
} from 'lucide-react';
import {
  TS_DISTRICTS,
  searchDistricts,
  getMandalsForDistrict,
  searchMandals,
  reverseGeocodeToTelangana,
  geocodeMandalOrVillage,
  LocationSuggestion,
} from '../../services/telanganaLocationService';

export interface LocationValue {
  state: string;
  district: string;
  mandal: string;
  village: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

interface Props {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  className?: string;
}

// ── Small autocomplete dropdown ────────────────────────────────────────────────
function AutoInput({
  label,
  value,
  onChange,
  suggestions,
  onSearch,
  placeholder,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  onSearch: (q: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleInput = (q: string) => {
    onChange(q);
    onSearch(q);
    setOpen(true);
  };

  const handleSelect = (s: string) => {
    onChange(s);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
        {label}{required && ' *'}
      </label>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { onSearch(value); setOpen(true); }}
          placeholder={placeholder || `Type to search ${label.toLowerCase()}…`}
          disabled={disabled}
          required={required}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 disabled:bg-stone-50"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); onSearch(''); setOpen(true); }}
            className="absolute right-2 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}
              onMouseDown={() => handleSelect(s)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 hover:text-emerald-900 ${
                s === value ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-stone-800'
              }`}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const LocationAutocomplete: React.FC<Props> = ({ value, onChange, className }) => {
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [gpsMsg, setGpsMsg] = useState('');
  const [districtSugg, setDistrictSugg]   = useState<string[]>([]);
  const [mandalSugg,   setMandalSugg]     = useState<string[]>([]);

  // Pre-populate on mount if district already set
  useEffect(() => {
    if (value.district) {
      setMandalSugg(getMandalsForDistrict(value.district));
    }
  }, [value.district]);

  // ── GPS detect ──────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMsg('Geolocation not supported. Please fill manually.');
      return;
    }
    setIsGeolocating(true);
    setGpsMsg('');
    setGpsStatus('idle');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const result = await reverseGeocodeToTelangana(latitude, longitude);
          if (result) {
            onChange({
              state:     result.state || 'Telangana',
              district:  result.district,
              mandal:    result.mandal,
              village:   result.village,
              pincode:   result.pincode,
              latitude,
              longitude,
            });
            setGpsStatus('success');
            setGpsMsg(
              result.isInTelangana
                ? `📍 ${result.village || result.mandal || result.district}, ${result.district}`
                : `📍 ${result.district}, ${result.state} (outside Telangana — edit if needed)`
            );
          } else {
            setGpsStatus('error');
            setGpsMsg('Could not resolve address. Please fill manually.');
            onChange({ ...value, latitude, longitude });
          }
        } catch {
          setGpsStatus('error');
          setGpsMsg('Location lookup failed. Please fill manually.');
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Please allow location access or fill manually.',
          2: 'Location unavailable. Please fill manually.',
          3: 'Request timed out. Please try again.',
        };
        setGpsStatus('error');
        setGpsMsg(msgs[err.code] || 'Location error. Please fill manually.');
        setIsGeolocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  };

  // ── Coord update when district/mandal/village change ────────────────────
  const updateCoords = useCallback(async (
    village: string, mandal: string, district: string
  ) => {
    if (!district) return;
    const coords = await geocodeMandalOrVillage(village, mandal, district);
    if (coords) {
      onChange(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
    }
  }, [onChange]);

  const handleDistrictChange = (d: string) => {
    onChange({ ...value, district: d, mandal: '', village: '', pincode: '', state: 'Telangana' });
    setMandalSugg(getMandalsForDistrict(d));
    setGpsStatus('idle');
  };

  const handleMandalChange = (m: string) => {
    onChange({ ...value, mandal: m, village: '', pincode: '' });
    updateCoords('', m, value.district);
  };

  const handleVillageChange = (v: string) => {
    onChange({ ...value, village: v });
    updateCoords(v, value.mandal, value.district);
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* GPS Button */}
      <button
        type="button"
        onClick={handleGPS}
        disabled={isGeolocating}
        className={`w-full py-3.5 rounded-2xl border-2 font-bold flex items-center justify-center gap-2.5 cursor-pointer transition-all disabled:opacity-60 text-sm ${
          gpsStatus === 'success'
            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
            : gpsStatus === 'error'
              ? 'border-amber-400 bg-amber-50 text-amber-800'
              : 'border-emerald-500 bg-emerald-800 text-white hover:bg-emerald-900'
        }`}
      >
        {isGeolocating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Detecting your location…</>
          : gpsStatus === 'success'
            ? <><CheckCircle2 className="w-4 h-4" /> Location Detected — tap to refresh</>
            : <><Navigation className="w-4 h-4" /> 📍 Use My Location</>
        }
      </button>

      {/* GPS feedback */}
      {gpsMsg && (
        <p className={`text-xs font-semibold ${gpsStatus === 'error' ? 'text-amber-700' : 'text-emerald-700'}`}>
          {gpsMsg}
        </p>
      )}

      {/* Divider */}
      <p className="text-[10px] text-stone-400 text-center">— or fill manually —</p>

      {/* District autocomplete */}
      <AutoInput
        label="State / District"
        value={value.district ? `${value.district}, Telangana` : ''}
        onChange={v => {
          // Strip ", Telangana" suffix if user typed it
          const cleaned = v.replace(/, Telangana$/, '').trim();
          handleDistrictChange(cleaned);
        }}
        suggestions={districtSugg.map(d => `${d}, Telangana`)}
        onSearch={q => {
          const cleaned = q.replace(/, Telangana$/, '').trim();
          setDistrictSugg(searchDistricts(cleaned).map(d => d.name));
        }}
        placeholder="e.g. Warangal or Karimnagar…"
        required
      />

      {/* Mandal */}
      <AutoInput
        label="Mandal / Taluk"
        value={value.mandal}
        onChange={handleMandalChange}
        suggestions={mandalSugg}
        onSearch={q => setMandalSugg(q ? getMandalsForDistrict(value.district).filter(m => m.toLowerCase().includes(q.toLowerCase())) : getMandalsForDistrict(value.district))}
        placeholder={value.district ? `Mandals in ${value.district}…` : 'Select district first'}
        disabled={!value.district}
      />

      {/* Village / City */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Village / City</label>
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={value.village}
              onChange={e => handleVillageChange(e.target.value)}
              placeholder="e.g. Lakshmipur"
              className="w-full pl-9 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">PIN Code</label>
          <input
            type="text"
            value={value.pincode}
            onChange={e => onChange({ ...value, pincode: e.target.value })}
            placeholder="506001"
            maxLength={6}
            pattern="[0-9]{6}"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Detected coords indicator */}
      {value.latitude && value.longitude && (
        <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          GPS coordinates saved ({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)})
        </p>
      )}
    </div>
  );
};
