import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKisanQ } from '../../context/KisanFlowContext';
import { SUPPORTED_LANGUAGES } from '../../translations';
import {
  ShieldCheck, User, Building2, Landmark, Headphones,
  ArrowRight, Eye, EyeOff, Loader2, Phone, Mail,
  CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { LanguageCode, UserProfile } from '../../types';
import { signUpWithEmail, signInWithEmail } from '../../utils/supabaseAuth';
import { LocationAutocomplete, LocationValue } from '../shared/LocationAutocomplete';

type AuthMode = 'login' | 'register';
type RoleTab = 'farmer' | 'operator' | 'government' | 'support';

const EMPTY_LOC: LocationValue = { state: 'Telangana', district: '', mandal: '', village: '', pincode: '' };

export const LoginPage: React.FC = () => {
  const { language, setLanguage, loginUser, centres } = useKisanQ();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<RoleTab>('farmer');
  const [authMode,  setAuthMode]  = useState<AuthMode>('login');
  const [showPwd,   setShowPwd]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');
  const [successMsg,setSuccessMsg]= useState('');

  // Shared
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Farmer fields
  const [farmerName,      setFarmerName]      = useState('');
  const [farmerPhone,     setFarmerPhone]     = useState('');
  const [farmerAadhaar,   setFarmerAadhaar]   = useState('');
  const [farmerLandAcres, setFarmerLandAcres] = useState('');
  const [location,        setLocation]        = useState<LocationValue>(EMPTY_LOC);

  // Staff fields
  const [staffName,       setStaffName]       = useState('');
  const [staffPhone,      setStaffPhone]      = useState('');
  const [staffEmployeeId, setStaffEmployeeId] = useState('');
  const [staffCentre,     setStaffCentre]     = useState(centres[0]?.id || '');
  const [govtDistrict,    setGovtDistrict]    = useState('');
  const [govtDept,        setGovtDept]        = useState('');

  const clear = () => { setErrorMsg(''); setSuccessMsg(''); };

  // ── FARMER AUTH ───────────────────────────────────────────────────────────
  const handleFarmerAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setIsLoading(true);
    try {
      if (authMode === 'register') {
        if (!farmerName || !farmerPhone) {
          setErrorMsg('Please enter your full name and mobile number.'); return;
        }
        if (!location.district) {
          setErrorMsg('Location is required. Use the 📍 GPS button or enter District manually.'); return;
        }
        if (!email || !password) {
          setErrorMsg('Please enter your email and password.'); return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.'); return;
        }

        const { session, error, needsEmailConfirmation } = await signUpWithEmail({
          email, password,
          name: farmerName, phone: farmerPhone, role: 'farmer',
          village:   location.village,
          mandal:    location.mandal,
          district:  location.district,
          state:     location.state || 'Telangana',
          pincode:   location.pincode,
          preferred_language: language,
          land_holding_acres: farmerLandAcres ? parseFloat(farmerLandAcres) : undefined,
          aadhaar_masked: farmerAadhaar,
          latitude:  location.latitude,
          longitude: location.longitude,
        });

        if (error) { setErrorMsg(error); return; }

        if (session) {
          setSuccessMsg('✓ Account created! Logging you in…');
          setTimeout(() => navigate('/farmer'), 1200);
        } else if (needsEmailConfirmation) {
          setSuccessMsg('Account created! Check your email for a confirmation link, then log in.');
          setAuthMode('login');
        } else {
          setSuccessMsg('✓ Account created! Logging you in…');
          setTimeout(() => navigate('/farmer'), 1200);
        }
      } else {
        if (!email || !password) { setErrorMsg('Please enter email and password.'); return; }
        const { error } = await signInWithEmail(email, password, 'farmer');
        if (error) { setErrorMsg(error); return; }
        setSuccessMsg('✓ Login successful! Redirecting…');
        setTimeout(() => navigate('/portal'), 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── STAFF AUTH ────────────────────────────────────────────────────────────
  const handleStaffAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    setIsLoading(true);
    try {
      if (authMode === 'register') {
        if (!staffName || !email || !password) {
          setErrorMsg('Please enter your name, email, and password.'); return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.'); return;
        }

        if (activeTab === 'government') {
          if (email !== 'rakeshpulidindi19@gmail.com' || password !== 'qwertypoiuy@1234' || staffName !== 'Pulidindi Rakesh' || staffPhone !== '8019841777') {
             setErrorMsg('Unauthorized Govt Details: Only approved state officials can register here.');
             return;
          }
        }

        const { session, error, needsEmailConfirmation } = await signUpWithEmail({
          email, password,
          name: staffName, phone: staffPhone, role: activeTab as UserProfile['role'],
          employee_id: staffEmployeeId,
          centre_id: activeTab === 'operator' ? (staffCentre || centres[0]?.id) : undefined,
          district:   activeTab === 'government' ? govtDistrict : undefined,
          designation: activeTab === 'government' ? govtDept : activeTab === 'support' ? 'Helpline Agent' : 'PENDING',
          preferred_language: language,
        });

        if (error) { setErrorMsg(error); return; }

        if (session) {
          setSuccessMsg('✓ Account created! Logging you in…');
          setTimeout(() => navigate(`/${activeTab}`), 1200);
        } else if (needsEmailConfirmation) {
          setSuccessMsg('Account created! Check your email for a confirmation link, then log in.');
          setAuthMode('login');
        } else {
          setSuccessMsg('✓ Account created! Logging you in…');
          setTimeout(() => navigate(`/${activeTab}`), 1200);
        }
      } else {
        if (!email || !password) { setErrorMsg('Please enter email and password.'); return; }
        
        if (activeTab === 'government' && email !== 'rakeshpulidindi19@gmail.com') {
           setErrorMsg('Unauthorized Govt Details: Only approved state officials can log in here.');
           return;
        }

        const { error } = await signInWithEmail(email, password, activeTab);
        if (error) { setErrorMsg(error); return; }
        setSuccessMsg('✓ Login successful! Redirecting…');
        setTimeout(() => navigate('/portal'), 500);
      }
    } finally {
      setIsLoading(false);
    }
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
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">KisanQ</h1>
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
              <div className="flex bg-stone-100 rounded-2xl p-1 gap-1">
                {(['login', 'register'] as const).map(m => (
                  <button key={m} type="button"
                    onClick={() => { setAuthMode(m); clear(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authMode === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}>
                    {m === 'login' ? '🔑 Login' : '📝 New Registration'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFarmerAuth} className="space-y-5">
                {authMode === 'register' && (
                  <>
                    {/* Step 1 — Personal details */}
                    <div className="space-y-3">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Step 1 — Your Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <LabelInput label="Full Name *" value={farmerName} onChange={setFarmerName} placeholder="Ravi Kumar" required />
                        <LabelInput label="Mobile Number *" value={farmerPhone} onChange={setFarmerPhone} placeholder="9848012345" type="tel" required icon={<Phone className="w-3.5 h-3.5 text-stone-400" />} />
                        <LabelInput label="Aadhaar (masked)" value={farmerAadhaar} onChange={setFarmerAadhaar} placeholder="XXXX-XXXX-4819" />
                        <LabelInput label="Land Holding (Acres)" value={farmerLandAcres} onChange={setFarmerLandAcres} placeholder="2.5" type="number" />
                      </div>
                    </div>

                    {/* Step 2 — Location with Telangana autocomplete */}
                    <div className="border-t border-stone-100 pt-4 space-y-2">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Step 2 — Your Location (Telangana)</p>
                      <LocationAutocomplete value={location} onChange={setLocation} />
                    </div>

                    {/* Step 3 — Language */}
                    <div className="border-t border-stone-100 pt-4">
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-3">Step 3 — Preferred Language</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {SUPPORTED_LANGUAGES.map(l => (
                          <button key={l.code} type="button" onClick={() => setLanguage(l.code as LanguageCode)}
                            className={`py-2 px-1 text-xs rounded-xl border transition-all cursor-pointer ${
                              language === l.code ? 'bg-emerald-800 text-white font-bold border-emerald-900' : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
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
                      <input type={showPwd ? 'text' : 'password'} required value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={authMode === 'register' ? 'Min. 6 characters' : '••••••••'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none pr-10" />
                      <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-2.5 text-stone-400 cursor-pointer">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                    : <>{authMode === 'login' ? 'Login as Farmer' : 'Create Farmer Account'} <ArrowRight className="w-4 h-4" /></>
                  }
                </button>

                {authMode === 'login' && (
                  <p className="text-center text-xs text-stone-500">
                    New farmer?{' '}
                    <button type="button" onClick={() => { setAuthMode('register'); clear(); }}
                      className="text-emerald-700 font-bold cursor-pointer hover:underline">
                      Create an account
                    </button>
                  </p>
                )}
              </form>
            </>
          )}

          {/* ── STAFF TABS ── */}
          {!isFarmerTab && (
            <>
              <div className="flex bg-stone-100 rounded-2xl p-1 gap-1 mb-4">
                {(['login', 'register'] as const).map(m => (
                  <button key={m} type="button"
                    onClick={() => { setAuthMode(m); clear(); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      authMode === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'
                    }`}>
                    {m === 'login' ? '🔑 Login' : '📝 New Account'}
                  </button>
                ))}
              </div>
            <form onSubmit={handleStaffAuth} className="space-y-4">
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

              {authMode === 'register' && (
                <>
                  <LabelInput label="Full Name *" value={staffName} onChange={setStaffName} placeholder="Enter your name" required />
                  <LabelInput label="Mobile Number" value={staffPhone} onChange={setStaffPhone} placeholder="9848000000" type="tel" icon={<Phone className="w-3.5 h-3.5 text-stone-400" />} />
                  
                  {activeTab !== 'government' && (
                    <LabelInput label="Employee / Agent ID" value={staffEmployeeId} onChange={setStaffEmployeeId} placeholder={activeTab === 'support' ? 'AGT-504' : 'MND-01'} />
                  )}

                  {activeTab === 'operator' && (
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Assigned Procurement Centre</label>
                      <select value={staffCentre || centres[0]?.id || ''} onChange={e => setStaffCentre(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white">
                        {Object.entries(
                          centres.reduce((acc, c) => {
                            if (!acc[c.district]) acc[c.district] = [];
                            acc[c.district].push(c);
                            return acc;
                          }, {} as Record<string, typeof centres>)
                        ).map(([district, distCentres]) => (
                          <optgroup key={district} label={district}>
                            {distCentres.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className={`${authMode === 'register' ? 'border-t border-stone-100 pt-4' : ''} space-y-3`}>
                {authMode === 'register' && (
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Account Credentials</p>
                )}
                <LabelInput label="Email Address *" value={email} onChange={setEmail} placeholder="staff@example.com" type="email" required icon={<Mail className="w-3.5 h-3.5 text-stone-400" />} />
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Password *</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} required value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={authMode === 'register' ? 'Min. 6 characters' : '••••••••'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none pr-10" />
                    <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-2.5 text-stone-400 cursor-pointer">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

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
            </form>
            </>
          )}
        </div>
    </div>
  );
};

function LabelInput({ label, value, onChange, placeholder, type = 'text', required, icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-2.5 pointer-events-none">{icon}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          className={`w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none ${icon ? 'pl-9' : ''}`} />
      </div>
    </div>
  );
}
