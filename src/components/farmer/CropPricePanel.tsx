/**
 * CropPricePanel — Accordion crop list with MSP + market prices
 * Rules:
 *  - No crop images
 *  - Down-arrow to expand each crop
 *  - MSP from Supabase crops table (govt official)
 *  - Market price from Supabase market_prices table (Agmarknet)
 *  - Gemini used only for crop info text, never for price fabrication
 *  - Source + date always shown
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import { supabase } from '../../utils/supabaseAuth';
import { Crop } from '../../types';
import {
  ChevronDown, ChevronUp, RefreshCw, TrendingUp,
  TrendingDown, Minus, AlertCircle, Loader2, Info,
} from 'lucide-react';

// ── Market price type ─────────────────────────────────────────────────────────
interface MarketPrice {
  market_name: string;
  district: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  arrival_tonnes: number | null;
  price_date: string;
  source: string;
  source_url: string | null;
}

// ── Fetch market prices for a crop from Supabase ──────────────────────────────
async function fetchMarketPrices(cropId: string, district?: string): Promise<MarketPrice[]> {
  try {
    let q = supabase
      .from('market_prices')
      .select('market_name,district,min_price,max_price,modal_price,arrival_tonnes,price_date,source,source_url')
      .eq('crop_id', cropId)
      .order('price_date', { ascending: false })
      .limit(5);

    if (district) {
      // Try district match first; if empty, fall back to all
      const { data: local } = await q.ilike('district', `%${district}%`);
      if (local && local.length > 0) return local as MarketPrice[];
    }

    const { data } = await q;
    return (data || []) as MarketPrice[];
  } catch {
    return [];
  }
}

// ── Gemini crop info (text only, never prices) ─────────────────────────────────
async function fetchCropInfoFromGemini(
  cropName: string,
  localName: string | undefined,
  language: string
): Promise<string> {
  const key = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GEMINI_API_KEY || '';
  if (!key) return '';

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: key });
    const langLabel = language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English';
    const prompt = `You are an agricultural expert for Indian farmers.
In 2-3 short sentences in ${langLabel}, describe:
- Best growing season for ${cropName} (${localName || ''}) in Telangana
- Typical yield per acre
- Key quality factors that affect MSP procurement acceptance (moisture %, FAQ standards)
Keep it simple and farmer-friendly. Do NOT mention any prices.`;

    const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return resp.text?.trim() || '';
  } catch {
    return '';
  }
}

// ── Price trend indicator ─────────────────────────────────────────────────────
function PriceTrend({ modal, msp }: { modal: number; msp: number }) {
  if (modal === 0 || msp === 0) return null;
  const pct = ((modal - msp) / msp) * 100;
  if (Math.abs(pct) < 2) return <span className="flex items-center gap-1 text-stone-500 text-xs"><Minus className="w-3 h-3" /> At MSP</span>;
  if (pct > 0) return <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold"><TrendingUp className="w-3 h-3" /> +{pct.toFixed(1)}% above MSP</span>;
  return <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><TrendingDown className="w-3 h-3" /> {pct.toFixed(1)}% below MSP</span>;
}

// ── Single crop accordion row ─────────────────────────────────────────────────
const CropRow: React.FC<{ crop: Crop; district?: string; language: string }> = ({
  crop, district, language,
}) => {
  const [open,         setOpen]         = useState(false);
  const [prices,       setPrices]       = useState<MarketPrice[]>([]);
  const [geminiInfo,   setGeminiInfo]   = useState('');
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingInfo,  setLoadingInfo]  = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoadingPrice(true);
    const mp = await fetchMarketPrices(crop.id, district);
    setPrices(mp);
    setLoadingPrice(false);

    if (!geminiInfo) {
      setLoadingInfo(true);
      const info = await fetchCropInfoFromGemini(crop.name, crop.local_name, language);
      setGeminiInfo(info);
      setLoadingInfo(false);
    }
  }, [open, crop.id, crop.name, crop.local_name, district, language, geminiInfo]);

  useEffect(() => { load(); }, [load]);

  const latestPrice = prices[0];
  const priceDate   = latestPrice?.price_date
    ? new Date(latestPrice.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-stone-50 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{crop.icon || '🌾'}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm text-stone-900 truncate">{crop.name}</p>
            {crop.local_name && (
              <p className="text-[11px] text-stone-500 truncate">
                {crop.local_name.split('/').slice(0, 2).join(' / ').trim()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-3">
          {/* MSP pill */}
          {crop.msp_per_quintal > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-stone-400 uppercase font-bold">MSP 2026-27</p>
              <p className="text-sm font-black text-emerald-800">₹{crop.msp_per_quintal.toLocaleString('en-IN')}/Qtl</p>
            </div>
          )}
          {/* Market price snippet */}
          {latestPrice && (
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-stone-400 uppercase font-bold">Market</p>
              <p className="text-sm font-black text-stone-800">₹{latestPrice.modal_price.toLocaleString('en-IN')}/Qtl</p>
            </div>
          )}
          <span className="text-stone-400">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-stone-100 bg-stone-50 px-4 py-4 space-y-4">
          {/* MSP + season info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase font-bold">MSP 2026-27</p>
              <p className="text-base font-black text-emerald-800 mt-0.5">
                {crop.msp_per_quintal > 0 ? `₹${crop.msp_per_quintal.toLocaleString('en-IN')}` : 'No MSP'}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">per quintal</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase font-bold">Category</p>
              <p className="text-sm font-bold text-stone-800 mt-0.5">{crop.category}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase font-bold">Season</p>
              <p className="text-sm font-bold text-stone-800 mt-0.5">{crop.season || '—'}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase font-bold">Source</p>
              <p className="text-sm font-bold text-stone-800 mt-0.5">Govt. of India</p>
              <p className="text-[10px] text-stone-400">CACP / DAC&FW</p>
            </div>
          </div>

          {/* Market prices */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Market Prices (APMC / Agmarknet)
              </p>
              {priceDate && (
                <p className="text-[10px] text-stone-400">Latest: {priceDate}</p>
              )}
            </div>

            {loadingPrice ? (
              <div className="flex items-center gap-2 text-xs text-stone-500 py-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading market prices…
              </div>
            ) : prices.length === 0 ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  No market price data available for {crop.name} yet.
                  Prices are sourced from <strong>Agmarknet</strong> (govt portal) and updated when available.
                  MSP of <strong>₹{crop.msp_per_quintal.toLocaleString('en-IN')}/Qtl</strong> is the guaranteed government purchase price.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {prices.map((p, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs font-bold text-stone-800">{p.market_name}</p>
                      <p className="text-[11px] text-stone-500">{p.district} · {new Date(p.price_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                      {p.arrival_tonnes && (
                        <p className="text-[10px] text-stone-400">Arrival: {p.arrival_tonnes.toLocaleString('en-IN')} tonnes</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-stone-900">₹{p.modal_price.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-stone-400">
                        ₹{p.min_price?.toLocaleString('en-IN')} – ₹{p.max_price?.toLocaleString('en-IN')}
                      </p>
                      <PriceTrend modal={p.modal_price} msp={crop.msp_per_quintal} />
                    </div>
                  </div>
                ))}

                {/* Attribution */}
                <p className="text-[10px] text-stone-400 flex items-center gap-1 pt-1">
                  <Info className="w-3 h-3" />
                  Source: {prices[0]?.source || 'Agmarknet'} —
                  <a href={prices[0]?.source_url || 'https://agmarknet.gov.in'} target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-stone-600">agmarknet.gov.in</a>.
                  Prices are indicative; MSP is the guaranteed minimum.
                </p>
              </div>
            )}
          </div>

          {/* Gemini crop info (text only, no prices) */}
          {(geminiInfo || loadingInfo) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                ⚡ Gemini AI — Crop Guide
                <span className="text-[9px] font-normal text-emerald-600">(info only, not prices)</span>
              </p>
              {loadingInfo
                ? <div className="flex items-center gap-2 text-xs text-emerald-700"><Loader2 className="w-3 h-3 animate-spin" /> Getting crop info…</div>
                : <p className="text-xs text-emerald-900 leading-relaxed">{geminiInfo}</p>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────
export const CropPricePanel: React.FC = () => {
  const { crops, authSession, language, refreshCrops } = useKisanQ();
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('');
  const [refreshing,setRefreshing]= useState(false);

  const district = authSession.user?.district;

  const categories = Array.from(new Set(crops.map(c => c.category))).sort();

  const filtered = crops.filter(c => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.local_name || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || c.category === category;
    return matchSearch && matchCategory;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCrops();
    setRefreshing(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-black text-stone-900">🌾 Crops & Prices</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              MSP 2026-27 (Govt of India) · Market prices from Agmarknet
              {district && ` · Showing prices near ${district}`}
            </p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-stone-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex-1 min-w-[140px] relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search crop…"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          >
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* MSP notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
        <span>
          <strong>MSP (Minimum Support Price)</strong> is the guaranteed government purchase price.
          Market prices may vary daily. KisanQ never fabricates prices — all data sourced from
          official government portals. <strong>Expand any crop ↓ for details.</strong>
        </span>
      </div>

      {/* Crop list */}
      {crops.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center">
          <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Loading crop data…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center text-sm text-stone-400">
          No crops match your search.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(crop => (
            <CropRow key={crop.id} crop={crop} district={district} language={language} />
          ))}
          <p className="text-[10px] text-stone-400 text-center pt-2">
            {filtered.length} crop{filtered.length !== 1 ? 's' : ''} shown ·
            MSP data: CACP (Commission for Agricultural Costs and Prices), Govt of India ·
            Market data: Agmarknet / National Horticultural Board
          </p>
        </div>
      )}
    </div>
  );
};
