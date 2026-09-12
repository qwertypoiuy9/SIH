import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useKisanQ } from '../../context/KisanFlowContext';
import { fetchCentresFromDB, discoverNearbyViaOSM, CentreFilter } from '../../services/centreService';
import { Centre } from '../../types';
import {
  MapPin, List, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  Clock, Phone, Users, Building2, Filter, Layers,
} from 'lucide-react';

// Fix Leaflet default icon path issue with Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const farmerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const centreIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [30, 49], iconAnchor: [15, 49], popupAnchor: [1, -34],
});

// Helper to fly map to a location
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 13, { duration: 1.2 }); }, [lat, lng, map]);
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  OPTIMAL: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  MODERATE: 'text-amber-700 bg-amber-50 border-amber-300',
  OVERLOADED: 'text-red-700 bg-red-50 border-red-300',
};

export const ProcurementCentersPage: React.FC = () => {
  const { authSession, centres: ctxCentres, crops, setFarmerView, bookFarmerSlot } = useKisanQ();
  const profile = authSession.user;

  const [centres, setCentres] = useState<Centre[]>(ctxCentres);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedCentre, setSelectedCentre] = useState<Centre | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [filter, setFilter] = useState<CentreFilter>({ showOpenOnly: false });
  const [showFilters, setShowFilters] = useState(false);
  const [bookingCrop, setBookingCrop] = useState('Paddy');
  const [bookingQty, setBookingQty] = useState(25);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const farmerLat = profile?.latitude;
  const farmerLng = profile?.longitude;
  const mapCenter: [number, number] = farmerLat && farmerLng ? [farmerLat, farmerLng] : [17.9784, 79.5941];

  const loadCentres = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const dbCentres = await fetchCentresFromDB(farmerLat, farmerLng, filter);
      if (dbCentres.length > 0) {
        setCentres(dbCentres);
      } else {
        // Try OSM discovery if DB is empty
        if (farmerLat && farmerLng) {
          const osmResults = await discoverNearbyViaOSM(farmerLat, farmerLng);
          if (osmResults.length > 0) {
            setCentres(osmResults as Centre[]);
          } else {
            setCentres(ctxCentres); // fallback to seeded data
          }
        } else {
          setCentres(ctxCentres);
        }
      }
    } catch {
      setErrorMsg('Failed to load procurement centres. Showing cached data.');
      setCentres(ctxCentres);
    } finally {
      setLoading(false);
    }
  }, [farmerLat, farmerLng, filter, ctxCentres]);

  useEffect(() => { loadCentres(); }, [loadCentres]);

  const handleSelectCentre = (centre: Centre) => {
    setSelectedCentre(centre);
    if (centre.latitude && centre.longitude) {
      setFlyTarget({ lat: centre.latitude, lng: centre.longitude });
    }
  };

  const handleBook = async (centreId: string) => {
    setBookingLoading(true);
    setBookingSuccess('');
    try {
      const reg = await bookFarmerSlot({ crop: bookingCrop, quantity: bookingQty, centreId });
      setBookingSuccess(`✓ Slot booked! Token #${reg.token_number} for ${bookingCrop} at the selected centre.`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const uniqueCrops = Array.from(new Set(centres.flatMap(c => c.accepted_crops || []))).filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-stone-900">📍 Procurement Centers</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            {farmerLat ? `Sorted by distance from ${profile?.village || 'your location'}` : 'Showing all available centres'}
            {' — '}{centres.length} centre{centres.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-stone-100 rounded-xl p-0.5">
            {(['map', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === v ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-800'}`}
              >
                {v === 'map' ? <Layers className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                {v === 'map' ? 'Map' : 'List'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(f => !f)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${showFilters ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            <Filter className="w-4 h-4" />
          </button>

          <button onClick={loadCentres} disabled={loading} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* No location notice */}
      {!farmerLat && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Location not set in profile</p>
            <p className="text-xs text-amber-700 mt-1">
              Add your district/village address in Profile to see centres sorted by distance and get accurate distance calculations.
            </p>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs font-bold text-stone-700 uppercase mb-3">Filter Centres</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.showOpenOnly}
                onChange={e => setFilter(f => ({ ...f, showOpenOnly: e.target.checked }))}
                className="rounded"
              />
              <span>Currently Open</span>
            </label>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-stone-600">Crop:</label>
              <select
                value={filter.acceptedCrop || ''}
                onChange={e => setFilter(f => ({ ...f, acceptedCrop: e.target.value || undefined }))}
                className="px-2 py-1 rounded-lg border border-stone-200 text-xs"
              >
                <option value="">All crops</option>
                {uniqueCrops.map(c => <option key={c} value={c}>{c}</option>)}
                {crops.slice(0, 10).map(c => <option key={c.id} value={c.name.split(' ')[0]}>{c.name.split(' ')[0]}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-stone-600">Max Distance:</label>
              <select
                value={filter.maxDistanceKm || ''}
                onChange={e => setFilter(f => ({ ...f, maxDistanceKm: e.target.value ? Number(e.target.value) : undefined }))}
                className="px-2 py-1 rounded-lg border border-stone-200 text-xs"
              >
                <option value="">Any distance</option>
                <option value="10">Within 10 km</option>
                <option value="25">Within 25 km</option>
                <option value="50">Within 50 km</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {errorMsg && <div className="bg-red-50 border border-red-300 rounded-2xl p-3 text-xs text-red-800 font-semibold">⚠️ {errorMsg}</div>}
      {bookingSuccess && <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-xs text-emerald-800 font-semibold">{bookingSuccess}</div>}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Finding procurement centres near you...</p>
        </div>
      ) : (
        <div className={`${viewMode === 'map' ? 'grid grid-cols-1 lg:grid-cols-3 gap-5' : ''}`}>

          {/* ── MAP VIEW ── */}
          {viewMode === 'map' && (
            <>
              {/* Map */}
              <div className="lg:col-span-2 h-[480px] rounded-3xl overflow-hidden border border-stone-200 shadow-sm z-0">
                <MapContainer center={mapCenter} zoom={10} className="h-full w-full" scrollWheelZoom>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Farmer marker */}
                  {farmerLat && farmerLng && (
                    <Marker position={[farmerLat, farmerLng]} icon={farmerIcon}>
                      <Popup>
                        <div className="text-xs font-bold">📍 Your Location<br />
                          <span className="font-normal">{profile?.village}, {profile?.district}</span>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Centre markers */}
                  {centres.map(c => c.latitude && c.longitude ? (
                    <Marker
                      key={c.id}
                      position={[c.latitude, c.longitude]}
                      icon={selectedCentre?.id === c.id ? selectedIcon : centreIcon}
                      eventHandlers={{ click: () => handleSelectCentre(c) }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 min-w-[180px]">
                          <p className="font-black text-sm">{c.name}</p>
                          <p className="text-stone-600">{c.district}, {c.state}</p>
                          {c.distance_km > 0 && <p className="text-emerald-700 font-bold">📍 {c.distance_km} km away</p>}
                          <p className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[c.status]}`}>{c.status}</p>
                          {c.accepted_crops && c.accepted_crops.length > 0 && (
                            <p className="text-stone-500">Crops: {c.accepted_crops.join(', ')}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ) : null)}

                  {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} />}
                </MapContainer>
              </div>

              {/* Centre list sidebar */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {centres.length === 0 ? (
                  <div className="bg-white rounded-2xl p-6 border border-stone-200 text-center text-xs text-stone-400">
                    No centres found for your filters.
                  </div>
                ) : centres.map((c, i) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCentre(c)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer space-y-2 ${selectedCentre?.id === c.id ? 'border-emerald-500 shadow-sm bg-emerald-50/40' : 'border-stone-200 hover:border-stone-400'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {i < 3 && <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">#{i + 1} Nearest</span>}
                          <p className="font-bold text-xs text-stone-900">{c.name}</p>
                        </div>
                        <p className="text-[11px] text-stone-500">{c.district}, {c.state}</p>
                      </div>
                      {c.distance_km > 0 && c.distance_km < 999 && (
                        <span className="text-xs font-black text-emerald-800 shrink-0">{c.distance_km} km</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      {c.is_open !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${c.is_open ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : 'text-stone-500 bg-stone-100 border-stone-200'}`}>
                          {c.is_open ? '🟢 Open' : '🔴 Closed'}
                        </span>
                      )}
                      <span className="text-stone-400 flex items-center gap-1"><Users className="w-3 h-3" />{c.counters_active} counters</span>
                    </div>

                    {c.open_hours && (
                      <p className="text-[10px] text-stone-500 flex items-center gap-1"><Clock className="w-3 h-3" />{c.open_hours}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── LIST VIEW ── */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {centres.map((c, i) => (
                <div key={c.id} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {i < 3 && <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">#{i + 1} Nearest</span>}
                        <h3 className="font-black text-base text-stone-900">{c.name}</h3>
                      </div>
                      {c.address && <p className="text-xs text-stone-500 mt-0.5">{c.address}</p>}
                      <p className="text-xs text-stone-500">{c.district}, {c.state}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {c.distance_km > 0 && c.distance_km < 999 && (
                        <p className="text-lg font-black text-emerald-800">{c.distance_km} km</p>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 rounded-2xl p-3">
                    <div><span className="text-stone-400 block text-[10px] uppercase">Capacity/Day</span><span className="font-bold">{c.capacity_per_day}</span></div>
                    <div><span className="text-stone-400 block text-[10px] uppercase">Active Counters</span><span className="font-bold">{c.counters_active}</span></div>
                    <div><span className="text-stone-400 block text-[10px] uppercase">Avg Processing</span><span className="font-bold">{c.avg_processing_mins} min</span></div>
                    <div><span className="text-stone-400 block text-[10px] uppercase">Hours</span><span className="font-bold">{c.open_hours || '--'}</span></div>
                  </div>

                  {c.accepted_crops && c.accepted_crops.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.accepted_crops.map(crop => (
                        <span key={crop} className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">{crop}</span>
                      ))}
                    </div>
                  )}

                  {c.contact && (
                    <p className="text-xs text-stone-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.contact}</p>
                  )}

                  {/* Quick booking section */}
                  <div className="border-t border-stone-100 pt-3">
                    <p className="text-[10px] font-bold text-stone-600 uppercase mb-2">Quick Book a Slot Here</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="text-[10px] text-stone-500 block">Crop</label>
                        <select
                          value={bookingCrop}
                          onChange={e => setBookingCrop(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs"
                        >
                          {(c.accepted_crops && c.accepted_crops.length > 0 ? c.accepted_crops : ['Paddy', 'Wheat', 'Cotton', 'Maize']).map(crop => (
                            <option key={crop} value={crop}>{crop}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-stone-500 block">Quantity (Qtl)</label>
                        <input type="number" min="1" value={bookingQty} onChange={e => setBookingQty(Number(e.target.value))}
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs" />
                      </div>
                      <button
                        onClick={() => handleBook(c.id)}
                        disabled={bookingLoading || !authSession.isAuthenticated}
                        className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {bookingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Book Slot
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected centre detail panel (map view) */}
      {viewMode === 'map' && selectedCentre && (
        <div className="bg-white rounded-3xl p-5 border border-emerald-300 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-black text-lg text-stone-900">{selectedCentre.name}</h3>
              <p className="text-xs text-stone-500">{selectedCentre.address || `${selectedCentre.district}, ${selectedCentre.state}`}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedCentre.distance_km > 0 && selectedCentre.distance_km < 999 && (
                <span className="font-black text-emerald-800">{selectedCentre.distance_km} km away</span>
              )}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[selectedCentre.status]}`}>{selectedCentre.status}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs bg-stone-50 rounded-2xl p-3">
            <div><span className="text-stone-400 block text-[10px] uppercase">Capacity</span><span className="font-bold">{selectedCentre.capacity_per_day}/day</span></div>
            <div><span className="text-stone-400 block text-[10px] uppercase">Counters</span><span className="font-bold">{selectedCentre.counters_active} active</span></div>
            <div><span className="text-stone-400 block text-[10px] uppercase">Avg Time</span><span className="font-bold">{selectedCentre.avg_processing_mins} min</span></div>
          </div>

          <p className="text-xs text-stone-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selectedCentre.open_hours}</p>

          {selectedCentre.accepted_crops && selectedCentre.accepted_crops.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedCentre.accepted_crops.map(crop => (
                <span key={crop} className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">{crop}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
            <div>
              <label className="text-[10px] text-stone-500 block">Crop</label>
              <select value={bookingCrop} onChange={e => setBookingCrop(e.target.value)} className="px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs">
                {(selectedCentre.accepted_crops?.length ? selectedCentre.accepted_crops : ['Paddy', 'Wheat', 'Cotton']).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-stone-500 block">Qty (Qtl)</label>
              <input type="number" min="1" value={bookingQty} onChange={e => setBookingQty(Number(e.target.value))} className="w-20 px-2.5 py-1.5 rounded-xl border border-stone-300 text-xs" />
            </div>
            <button
              onClick={() => handleBook(selectedCentre.id)}
              disabled={bookingLoading || !authSession.isAuthenticated}
              className="px-5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl cursor-pointer transition-all disabled:opacity-60 flex items-center gap-1.5"
            >
              {bookingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Book Slot at This Centre
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
