import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKisanFlow } from '../../context/KisanFlowContext';
import { SUPPORTED_LANGUAGES } from '../../translations';
import {
  ShieldCheck, User, Building2, Landmark, Headphones,
  ArrowRight, Eye, EyeOff, Loader2, MapPin, Phone, Mail,
  CheckCircle2, AlertTriangle, Navigation, ChevronDown, Edit2,
} from 'lucide-react';
import { LanguageCode, UserProfile } from '../../types';
import { signUpWithEmail, signInWithEmail, reverseGeocode } from '../../utils/supabaseAuth';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu and Kashmir','Ladakh',
];

type AuthMode = 'login' | 'register';
type RoleTab = 'farmer' | 'operator' | 'government' | 'support';

export const LoginPage: React.FC = () => {
  const { language, setLanguage, loginUser } = useKisanFlow();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]   = useState<RoleTab>('farmer');
  const [authMode, setAuthMode]     = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Shared
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');

  // Farmer fields
  const [farmerName,    setFarmerName]    = useState('');
  const [farmerPhone,   setFarmerPhone]   = useState('');
  const [farmerState,   setFarmerState]   = useState('');
  const [farmerDistrict,setFarmerDistrict]= useState('');
  const [farmerMandal,  setFarmerMandal]  = useState('');
  const [farmerVillage, setFarmerVillage] = useState('');
  const [farmerPincode, setFarmerPincode] = useState('');
  const [farmerAddress, setFarmerAddress] = useState('');
  const [farmerAadhaar, setFarmerAadhaar] = useState('');
  const [farmerLandAcres, setFarmerLandAcres] = useState('');
  const [farmerLat, setFarmerLat] = useState<number | undefined>();
  const [farmerLng, setFarmerLng] = useState<number | undefined>();
  const [locationDetected, setLocationDetected] = useState(false);

  // Staff fields
  const [staffName,       setStaffName]       = useState('');
  const [staffPhone,      setStaffPhone]      = useState('');
  const [staffEmployeeId, setStaffEmployeeId] = useState('');
  const [staffCentre,     setStaffCentre]     = useState('ctr_wgl_lakshmipur');
  const [govtDistrict,    setGovtDistrict]    = useState('');
  const [govtDept,        setGovtDept]        = useState('');

  const clear = () => { setErrorMsg(''); setSuccessMsg(''); };

  // ── USE MY LOCATION ──────────────────────────────────────────────────────
  const handleUseLocation = () => {
    clear();
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation not supported. Please fill address manually.');
      setShowManualAddress(true);
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFarmerLat(latitude);
        setFarmerLng(longitude);
        try {
          const result = await reverseGeocode(latitude, longitude);
          if (result) {
            if (result.state)    setFarmerState(result.state);
            if (result.district) setFarmerDistrict(result.district);
            if (result.mandal)   setFarmerMandal(result.mandal);
            if (result.village)  setFarmerVillage(result.village);
            if (result.pincode)  setFarmerPincode(result.pincode);
            if (result.formattedAddress) setFarmerAddress(result.formattedAddress);
            setLocationDetected(true);
            setShowManualAddress(false);
            setSuccessMsg(`📍 Location detected: ${result.village || result.district}, ${result.state}`);
          } else {
            setErrorMsg('Could not resolve address from GPS. Please fill manually below.');
            setShowManualAddress(true);
          }
        } catch {
          setErrorMsg('Location lookup failed. Please fill address manually.');
          setShowManualAddress(true);
        }
        setIsGeolocating(false);
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Please allow location access or fill address manually.',
          2: 'Location signal unavailable. Please fill address manually.',
          3: 'Location request timed out. Please try again or fill manually.',
        };
        setErrorMsg(msgs[err.code] || 'Location error. Please fill address manually.');
        setShowManualAddress(true);
        setIsGeolocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  };

  // ── FARMER AUTH ───────────────────────────────────────────────────────────
  const handleFarmerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setIsLoading(true);
    try {
      if (authMode === 'register') {
        if (!farmerName || !farmerPhone) {
          setErrorMsg('Please enter your name and mobile number.');
          return;
        }
        if (!farmerState || !farmerDistrict) {
          setErrorMsg('Location is required. Tap "Use My Location" or fill State & District manually.');
          setShowManualAddress(true);
          return;
        }
        if (!email || !password) {
          setErrorMsg('Please enter your email and password.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          return;
        }

        const { session, error, needsEmailConfirmation } = await signUpWithEmail({
          email, password,
          name: farmerName, phone: farmerPhone, role: 'farmer',
          address: farmerAddress, village: farmerVillage,
          mandal: farmerMandal, district: farmerDistrict,
          state: farmerState, pincode: farmerPincode,
          preferred_language: language,
          land_holding_acres: farmerLandAcres ? parseFloat(farmerLandAcres) : undefined,
          aadhaar_masked: farmerAadhaar,
          latitude: farmerLat, longitude: farmerLng,
        });

        if (error) { setErrorMsg(error); return; }

        if (session) {
          setSuccessMsg('✓ Account created! Logging you in...');
          setTimeout(() => navigate('/farmer'), 1200);
        } else if (needsEmailConfirmation) {
          setSuccessMsg('Account created! Check your email for a confirmation link, then log in.');
          setAuthMode('login');
        } else {
          setSuccessMsg('✓ Account created! Logging you in...');
          setTimeout(() => navigate('/farmer'), 1200);
        }
      } else {
        if (!email || !password) { setErrorMsg('Please enter email and password.'); return; }
        const { error } = await signInWithEmail(email, password);
        if (error) { setErrorMsg(error); return; }
        setSuccessMsg('✓ Login successful! Redirecting...');
        setTimeout(() => navigate('/portal'), 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── STAFF QUICK LOGIN ─────────────────────────────────────────────────────
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    if (!staffName) { setErrorMsg('Please enter your name.'); return; }
    const roleMap: Record<RoleTab, UserProfile['role']> = {
      farmer: 'farmer', operator: 'operator', government: 'government', support: 'support',
    };
    const profile: UserProfile = {
      id: `${activeTab}_${Date.now()}`,
      role: roleMap[activeTab], name: staffName,
      phone: staffPhone || '9848000000',
      employee_id: staffEmployeeId,
      centre_id: activeTab === 'operator' ? staffCentre : undefined,
      district: activeTab === 'government' ? govtDistrict : undefined,
      designation: activeTab === 'government' ? govtDept
        : activeTab === 'support' ? 'Helpline Agent' : 'Mandi Operator',
      preferred_language: language,
    };
    loginUser(profile);
    navigate(activeTab === 'operator' ? '/operator' : activeTab === 'government' ? '/government' : '/support');
  };

  const isFarmerTab = activeTab === 'farmer';

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center py-10 px-4 bg-stone-50">
      {/* Header */}
      <div className="max-w-xl w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-full text-emerald-900 text-xs font-bold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          NATIONAL AGRICULTURAL PROCUREMENT PORTAL • MSP 2026-27
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">KisanFlow</h1>
        <p className="text-sm font-semibold text-emerald-800 mt-1">Smart Mandi Procurement Management System</p>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Role Tabs */}
        <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50 text-xs font-bold">
          {([
            { id: 'farmer',     icon: <User className="w-3.5 h-3.5" />,       label: 'Farmer',   color: 'text-emerald-700 border-emerald-700' },
            { id: 'operator',   icon: <Building2 className="w-3.5 h-3.5" />,  label: 'Operator', color: 'text-amber-700 border-amber-600' },
            { id: 'government', icon: <Landmark className="w-3.5 h-3.5" />,   label: 'Officer',  color: 'text-blue-700 border-blue-600' },
            { id: 'support',    icon: <Headphones className="w-3.5 h-3.5" />, label: 'Support',  color: 'text-purple-700 border-purple-600' },
          ] as const).map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id as RoleTab); clear(); setAuthMode('login'); }}
              className={`py-3.5 px-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === tab.id ? `bg-white ${tab.color} border-b-2` : 'text-stone-500 hover:text-stone-800'
              }`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          {/* Banners */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-red-800 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" /><span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /><span>{successMsg}</span>
            </div>
          )}

          {/* ── FARMER TAB ── */}
          {isFarmerTab && (
            <>
              {/* Login / Register toggle */}
              <div className="flex bg-stone-100 rounded-2xl p-1 gap-1">
                {(['login', 'register'] as const).map(m => (
                  <button key={m} type="button" onClick={() => { setAuthMode(m); clear(); setLocationDetected(false); setShowManualAddress(false); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authMode === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}>
                    {m === 'login' ? '🔑 Login' : '📝 New Registration'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFarmerAuth} className="space-y-4">
                {authMode === 'register' && (
                  <>
                    {/* Step 1: Basic info */}
                    <div className="space-y-3">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Step 1 — Your Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <LabelInput label="Full Name *" value={farmerName} onChange={setFarmerName} placeholder="Ravi Kumar" required />
                        <LabelInput label="Mobile Number *" value={farmerPhone} onChange={setFarmerPhone} placeholder="9848012345" type="tel" required icon={<Phone className="w-3.5 h-3.5 text-stone-400" />} />
                        <LabelInput label="Aadhaar (masked)" value={farmerAadhaar} onChange={setFarmerAadhaar} placeholder="XXXX-XXXX-4819" />
                        <LabelInput label="Land Holding (Acres)" value={farmerLandAcres} onChange={setFarmerLandAcres} placeholder="2.5" type="number" />
                      </div>
                    </div>

                    {/* Step 2: Location — GPS first, manual as fallback */}
                    <div className="border-t border-stone-100 pt-4 space-y-3">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Step 2 — Your Location</p>

                      {/* Primary: GPS button */}
                      <button
                        type="button"
                        onClick={handleUseLocation}
                        disabled={isGeolocating}
                        className={`w-full py-4 rounded-2xl border-2 font-bold flex items-center justify-center gap-3 cursor-pointer transition-all disabled:opacity-60 shadow-sm ${
                          locationDetected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-emerald-500 bg-emerald-800 text-white hover:bg-emerald-900'
                        }`}
                      >
                        {isGeolocating ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /><span>Detecting your location...</span></>
                        ) : locationDetected ? (
                          <><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span>Location Detected ✓ — Tap to Refresh</span></>
                        ) : (
                          <><Navigation className="w-5 h-5" /><span>📍 Use My Location</span></>
                        )}
                      </button>

                      {/* Show detected location as a read-only card */}
                      {locationDetected && !showManualAddress && (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-black text-stone-900">
                              {[farmerVillage, farmerMandal, farmerDistrict].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-xs text-stone-600">{farmerState} — {farmerPincode}</p>
                            {farmerAddress && <p className="text-[11px] text-stone-400 leading-tight">{farmerAddress}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowManualAddress(true)}
                            className="shrink-0 text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        </div>
                      )}

                      {/* Manual fallback — collapsible */}
                      {(!locationDetected || showManualAddress) && (
                        <div className="space-y-3">
                          {!locationDetected && (
                            <p className="text-[11px] text-stone-400 text-center">
                              — or enter manually —
                            </p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">State *</label>
                              <div className="relative">
                                <select value={farmerState} onChange={e => setFarmerState(e.target.value)} required
                                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none bg-white pr-8">
                                  <option value="">Select State</option>
                                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 absolute right-2.5 top-3.5 text-stone-400 pointer-events-none" />
                              </div>
                            </div>
                            <LabelInput label="District *" value={farmerDistrict} onChange={setFarmerDistrict} placeholder="e.g. Warangal" required icon={<MapPin className="w-3.5 h-3.5 text-stone-400" />} />
                            <LabelInput label="Mandal / Taluk" value={farmerMandal} onChange={setFarmerMandal} placeholder="e.g. Warangal Rural" />
                            <LabelInput label="Village" value={farmerVillage} onChange={setFarmerVillage} placeholder="e.g. Lakshmipur" />
                            <LabelInput label="PIN Code" value={farmerPincode} onChange={setFarmerPincode} placeholder="506001" maxLength={6} />
                            <LabelInput label="Address (optional)" value={farmerAddress} onChange={setFarmerAddress} placeholder="Door No., Street" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 3: Language */}
                    <div className="border-t border-stone-100 pt-4">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-3">Step 3 — Preferred Language</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {SUPPORTED_LANGUAGES.map(l => (
                          <button key={l.code} type="button" onClick={() => setLanguage(l.code as LanguageCode)}
                            className={`py-2 px-1 text-xs rounded-xl border transition-all cursor-pointer ${
                              language === l.code
                                ? 'bg-emerald-800 text-white font-bold border-emerald-900'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}>
                            {l.nativeName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Email + Password */}
                <div className={`${authMode === 'register' ? 'border-t border-stone-100 pt-4' : ''} space-y-3`}>
                  {authMode === 'register' && (
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Step 4 — Account Credentials</p>
                  )}
                  <LabelInput label="Email Address *" value={email} onChange={setEmail} placeholder="farmer@example.com" type="email" required icon={<Mail className="w-3.5 h-3.5 text-stone-400" />} />
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Password *</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={authMode === 'register' ? 'Min. 6 characters' : '••••••••'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none pr-10" />
                      <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-2.5 text-stone-400 cursor-pointer">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isLoading || isGeolocating}
                  className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    : <>{authMode === 'login' ? 'Login as Farmer' : 'Create Farmer Account'} <ArrowRight className="w-4 h-4" /></>
                  }
                </button>

                {authMode === 'login' && (
                  <p className="text-center text-xs text-stone-500">
                    New farmer?{' '}
                    <button type="button" onClick={() => { setAuthMode('register'); clear(); }} className="text-emerald-700 font-bold cursor-pointer hover:underline">
                      Create an account
                    </button>
                  </p>
                )}
              </form>
            </>
          )}

          {/* ── STAFF TABS ── */}
          {!isFarmerTab && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="pb-3 border-b border-stone-100">
                <h2 className="text-base font-bold text-stone-900">
                  {activeTab === 'operator' ? '🏭 Mandi Operator Access'
                    : activeTab === 'government' ? '🏛️ Government Officer Access'
                    : '🎧 Support Agent Access'}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  {activeTab === 'operator' ? 'Queue management, quality check & payment processing'
                    : activeTab === 'government' ? 'District & state-level procurement oversight'
                    : 'AI-powered helpline & escalation portal'}
                </p>
              </div>

              <LabelInput label="Full Name *" value={staffName} onChange={setStaffName} placeholder="Enter your name" required />
              <LabelInput label="Mobile Number" value={staffPhone} onChange={setStaffPhone} placeholder="9848000000" type="tel" icon={<Phone className="w-3.5 h-3.5 text-stone-400" />} />
              <LabelInput label="Employee / Agent ID" value={staffEmployeeId} onChange={setStaffEmployeeId} placeholder={activeTab === 'support' ? 'AGT-504' : 'MND-01'} />

              {activeTab === 'operator' && (
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Assigned Procurement Centre</label>
                  <select value={staffCentre} onChange={e => setStaffCentre(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white">
                    <option value="ctr_wgl_lakshmipur">Lakshmipur Procurement Centre — Warangal</option>
                    <option value="ctr_wgl_ramapuram">Ramapuram APMC Centre — Warangal</option>
                    <option value="ctr_wgl_kothuru">Kothuru Processing Centre — Warangal</option>
                    <option value="ctr_gun_mangalgiri">Mangalagiri APMC — Guntur, AP</option>
                    <option value="ctr_kg_kakinada">Kakinada Procurement Centre — East Godavari</option>
                    <option value="ctr_pun_ludhiana">Ludhiana Grain Market — Punjab</option>
                    <option value="ctr_pun_amritsar">Amritsar Central Mandi — Punjab</option>
                    <option value="ctr_mah_nagpur">Nagpur Central Market — Maharashtra</option>
                    <option value="ctr_kar_belgaum">Belagavi APMC Market — Karnataka</option>
                  </select>
                </div>
              )}

              {activeTab === 'government' && (
                <div className="grid grid-cols-2 gap-3">
                  <LabelInput label="District / State HQ" value={govtDistrict} onChange={setGovtDistrict} placeholder="Warangal" />
                  <LabelInput label="Department" value={govtDept} onChange={setGovtDept} placeholder="Dept. of Agriculture" />
                </div>
              )}

              <button type="submit" disabled={isLoading}
                className={`w-full py-3.5 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 ${
                  activeTab === 'operator' ? 'bg-amber-700 hover:bg-amber-800'
                  : activeTab === 'government' ? 'bg-blue-800 hover:bg-blue-900'
                  : 'bg-purple-800 hover:bg-purple-900'
                }`}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><span>Login as {activeTab === 'government' ? 'Officer' : activeTab === 'support' ? 'Support Agent' : 'Operator'}</span><ArrowRight className="w-4 h-4" /></>
                }
              </button>
              <p className="text-[10px] text-stone-400 text-center">Demo mode — no password required for staff portals</p>
            </form>
          )}
        </div>
      </div>

      <p className="text-[10px] text-stone-400 mt-4 text-center max-w-sm">
        🔒 Secured by Supabase Auth · Row Level Security · Location via OpenStreetMap
      </p>
    </div>
  );
};

function LabelInput({ label, value, onChange, placeholder, type = 'text', required, icon, maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
  icon?: React.ReactNode; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-2.5 pointer-events-none">{icon}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required} maxLength={maxLength}
          className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none ${icon ? 'pl-9' : ''}`} />
      </div>
    </div>
  );
}
