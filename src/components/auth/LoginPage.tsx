import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import { SUPPORTED_LANGUAGES } from '../../translations';
import {
  ShieldCheck, User, Building2, Landmark, Headphones,
  ArrowRight, Eye, EyeOff, Loader2, MapPin, Phone, Mail,
  ChevronDown,
} from 'lucide-react';
import { LanguageCode, UserProfile } from '../../types';
import { signUpWithEmail, signInWithEmail } from '../../utils/supabaseAuth';

// ── Indian states list ──────────────────────────────────────────────────────
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

  const [activeTab, setActiveTab] = useState<RoleTab>('farmer');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Shared auth fields ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Farmer registration fields ──────────────────────────────────────────
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerState, setFarmerState] = useState('');
  const [farmerDistrict, setFarmerDistrict] = useState('');
  const [farmerMandal, setFarmerMandal] = useState('');
  const [farmerVillage, setFarmerVillage] = useState('');
  const [farmerPincode, setFarmerPincode] = useState('');
  const [farmerAddress, setFarmerAddress] = useState('');
  const [farmerAadhaar, setFarmerAadhaar] = useState('');
  const [farmerLandAcres, setFarmerLandAcres] = useState('');

  // ── Operator / Govt / Support fields ────────────────────────────────────
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmployeeId, setStaffEmployeeId] = useState('');
  const [staffCentre, setStaffCentre] = useState('ctr_wgl_lakshmipur');
  const [govtDistrict, setGovtDistrict] = useState('');
  const [govtDept, setGovtDept] = useState('');

  const clearMessages = () => { setErrorMsg(''); setSuccessMsg(''); };

  // ══════════════════════════════════════════════════════════════════════════
  // FARMER — Real Supabase Auth sign-up / sign-in
  // ══════════════════════════════════════════════════════════════════════════
  const handleFarmerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      if (authMode === 'register') {
        if (!farmerName || !email || !password || !farmerPhone || !farmerState || !farmerDistrict) {
          setErrorMsg('Please fill in all required fields (marked *).');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          return;
        }

        const { error } = await signUpWithEmail({
          email,
          password,
          name: farmerName,
          phone: farmerPhone,
          role: 'farmer',
          address: farmerAddress,
          village: farmerVillage,
          mandal: farmerMandal,
          district: farmerDistrict,
          state: farmerState,
          pincode: farmerPincode,
          preferred_language: language,
          land_holding_acres: farmerLandAcres ? parseFloat(farmerLandAcres) : undefined,
          aadhaar_masked: farmerAadhaar,
        });

        if (error) { setErrorMsg(error); return; }
        setSuccessMsg('Registration successful! Please check your email to confirm your account, then log in.');
        setAuthMode('login');
      } else {
        // Login
        if (!email || !password) { setErrorMsg('Please enter email and password.'); return; }
        const { error } = await signInWithEmail(email, password);
        if (error) { setErrorMsg(error); return; }
        // Context's onAuthStateChange listener will handle navigation automatically
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATOR / GOVT / SUPPORT — Legacy fake-auth (no password needed for demo)
  // These roles use the existing non-Supabase-Auth flow for demo purposes.
  // In production, wire these to real Supabase Auth with proper role checks.
  // ══════════════════════════════════════════════════════════════════════════
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!staffName) { setErrorMsg('Please enter your name.'); return; }

    const roleMap: Record<RoleTab, UserProfile['role']> = {
      farmer: 'farmer',
      operator: 'operator',
      government: 'government',
      support: 'support',
    };

    const profile: UserProfile = {
      id: `${activeTab}_${staffEmployeeId || staffName.replace(/\s/g, '_').toLowerCase()}_${Date.now()}`,
      role: roleMap[activeTab],
      name: staffName,
      phone: staffPhone || '9848000000',
      employee_id: staffEmployeeId,
      centre_id: activeTab === 'operator' ? staffCentre : undefined,
      district: activeTab === 'government' ? govtDistrict : undefined,
      designation: activeTab === 'government' ? govtDept : activeTab === 'support' ? 'Helpline Agent' : 'Mandi Operator',
      preferred_language: language,
    };
    loginUser(profile);
  };

  const isFarmerTab = activeTab === 'farmer';

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center py-10 px-4 bg-stone-50">
      {/* Header */}
      <div className="max-w-xl w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-full text-emerald-900 text-xs font-bold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>NATIONAL AGRICULTURAL PROCUREMENT PORTAL • MSP 2026-27</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">KisanFlow</h1>
        <p className="text-sm font-semibold text-emerald-800 mt-1">Smart Mandi Procurement Management System</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Role Tabs */}
        <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50 text-xs font-bold">
          {([
            { id: 'farmer', icon: <User className="w-3.5 h-3.5" />, label: 'Farmer', color: 'text-emerald-700 border-emerald-700' },
            { id: 'operator', icon: <Building2 className="w-3.5 h-3.5" />, label: 'Operator', color: 'text-amber-700 border-amber-600' },
            { id: 'government', icon: <Landmark className="w-3.5 h-3.5" />, label: 'Officer', color: 'text-blue-700 border-blue-600' },
            { id: 'support', icon: <Headphones className="w-3.5 h-3.5" />, label: 'Support', color: 'text-purple-700 border-purple-600' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as RoleTab); clearMessages(); setAuthMode('login'); }}
              className={`py-3.5 px-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? `bg-white ${tab.color} border-b-2`
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          {/* Error / Success banners */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-300 rounded-2xl p-3 text-xs text-red-800 font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-xs text-emerald-800 font-semibold">
              ✓ {successMsg}
            </div>
          )}

          {/* ── FARMER TAB ── */}
          {isFarmerTab && (
            <>
              {/* Login / Register toggle */}
              <div className="flex bg-stone-100 rounded-2xl p-1 gap-1">
                {(['login', 'register'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setAuthMode(m); clearMessages(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authMode === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {m === 'login' ? '🔑 Login' : '📝 New Registration'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFarmerAuth} className="space-y-4">
                {/* Register-only fields */}
                {authMode === 'register' && (
                  <>
                    <p className="text-[10px] text-stone-500 font-semibold uppercase">Personal Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <LabelInput label="Full Name *" value={farmerName} onChange={setFarmerName} placeholder="Ravi Kumar" required />
                      <LabelInput label="Mobile Number *" value={farmerPhone} onChange={setFarmerPhone} placeholder="9848012345" type="tel" required icon={<Phone className="w-3.5 h-3.5 text-stone-400" />} />
                      <LabelInput label="Aadhaar (masked)" value={farmerAadhaar} onChange={setFarmerAadhaar} placeholder="XXXX-XXXX-4819" />
                      <LabelInput label="Land Holding (Acres)" value={farmerLandAcres} onChange={setFarmerLandAcres} placeholder="2.5" type="number" />
                    </div>

                    <div className="border-t border-stone-100 pt-3">
                      <p className="text-[10px] text-stone-500 font-semibold uppercase mb-3">
                        📍 Address (used for nearby centre discovery)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* State dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">State *</label>
                          <div className="relative">
                            <select
                              value={farmerState}
                              onChange={e => setFarmerState(e.target.value)}
                              required
                              className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none bg-white pr-8"
                            >
                              <option value="">Select State</option>
                              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2.5 top-3.5 text-stone-400 pointer-events-none" />
                          </div>
                        </div>
                        <LabelInput label="District *" value={farmerDistrict} onChange={setFarmerDistrict} placeholder="Warangal" required icon={<MapPin className="w-3.5 h-3.5 text-stone-400" />} />
                        <LabelInput label="Mandal / Taluk" value={farmerMandal} onChange={setFarmerMandal} placeholder="Warangal Rural" />
                        <LabelInput label="Village / Locality" value={farmerVillage} onChange={setFarmerVillage} placeholder="Lakshmipur" />
                        <LabelInput label="PIN Code" value={farmerPincode} onChange={setFarmerPincode} placeholder="506001" type="text" maxLength={6} />
                        <LabelInput label="Full Address (optional)" value={farmerAddress} onChange={setFarmerAddress} placeholder="Door No., Street, Area" />
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-3">
                      <p className="text-[10px] text-stone-500 font-semibold uppercase mb-3">🌐 Preferred Language</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {SUPPORTED_LANGUAGES.map(l => (
                          <button
                            key={l.code}
                            type="button"
                            onClick={() => setLanguage(l.code as LanguageCode)}
                            className={`py-2 px-1 text-xs rounded-xl border transition-all cursor-pointer ${
                              language === l.code
                                ? 'bg-emerald-800 text-white font-bold border-emerald-900'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {l.nativeName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Email + Password (always) */}
                <div className="border-t border-stone-100 pt-3 space-y-3">
                  <LabelInput
                    label="Email Address *"
                    value={email}
                    onChange={setEmail}
                    placeholder="farmer@example.com"
                    type="email"
                    required
                    icon={<Mail className="w-3.5 h-3.5 text-stone-400" />}
                  />
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={authMode === 'register' ? 'At least 6 characters' : '••••••••'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-2.5 text-stone-400 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : (
                    <>{authMode === 'login' ? 'Login as Farmer' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                {authMode === 'login' && (
                  <p className="text-center text-xs text-stone-500">
                    New farmer?{' '}
                    <button type="button" onClick={() => setAuthMode('register')} className="text-emerald-700 font-bold cursor-pointer hover:underline">
                      Create an account
                    </button>
                  </p>
                )}
              </form>
            </>
          )}

          {/* ── OPERATOR / GOVT / SUPPORT TABS ── */}
          {!isFarmerTab && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    {activeTab === 'operator' ? 'Mandi Operator Access' : activeTab === 'government' ? 'Government Officer Access' : 'Support Agent Access'}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {activeTab === 'operator' ? 'Manage queue, quality, weighing & J-Forms' : activeTab === 'government' ? 'District & State command oversight' : 'AI-powered helpline agent portal'}
                  </p>
                </div>
              </div>

              <LabelInput label="Full Name *" value={staffName} onChange={setStaffName} placeholder="Enter your name" required />
              <LabelInput label="Mobile Number" value={staffPhone} onChange={setStaffPhone} placeholder="9848000000" type="tel" />
              <LabelInput label="Employee / Agent ID" value={staffEmployeeId} onChange={setStaffEmployeeId} placeholder={activeTab === 'support' ? 'AGT-504' : 'MND-01'} />

              {activeTab === 'operator' && (
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Assigned Procurement Centre</label>
                  <select
                    value={staffCentre}
                    onChange={e => setStaffCentre(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="ctr_wgl_lakshmipur">Lakshmipur Procurement Centre</option>
                    <option value="ctr_wgl_ramapuram">Ramapuram APMC Centre</option>
                    <option value="ctr_wgl_kothuru">Kothuru Processing Centre</option>
                    <option value="ctr_gun_mangalgiri">Mangalagiri APMC, Guntur</option>
                    <option value="ctr_kg_kakinada">Kakinada Procurement Centre</option>
                    <option value="ctr_pun_ludhiana">Ludhiana Grain Market</option>
                    <option value="ctr_pun_amritsar">Amritsar Central Mandi</option>
                    <option value="ctr_mah_nagpur">Nagpur Central Market</option>
                    <option value="ctr_kar_belgaum">Belagavi APMC Market</option>
                  </select>
                </div>
              )}

              {activeTab === 'government' && (
                <div className="grid grid-cols-2 gap-3">
                  <LabelInput label="District / State HQ" value={govtDistrict} onChange={setGovtDistrict} placeholder="Warangal" />
                  <LabelInput label="Department" value={govtDept} onChange={setGovtDept} placeholder="Dept. of Agriculture" />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 ${
                  activeTab === 'operator' ? 'bg-amber-700 hover:bg-amber-800'
                  : activeTab === 'government' ? 'bg-blue-800 hover:bg-blue-900'
                  : 'bg-purple-800 hover:bg-purple-900'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Login as {activeTab === 'government' ? 'Officer' : activeTab === 'support' ? 'Support Agent' : 'Operator'}</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="text-[10px] text-stone-400 mt-4 text-center max-w-sm">
        🔒 Secured by Supabase Authentication. Farmer data protected by Row Level Security.
      </p>
    </div>
  );
};

// ── Reusable labeled input ──────────────────────────────────────────────────
function LabelInput({
  label, value, onChange, placeholder, type = 'text', required, icon, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
  icon?: React.ReactNode; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-2.5 pointer-events-none">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none ${icon ? 'pl-9' : ''}`}
        />
      </div>
    </div>
  );
}
