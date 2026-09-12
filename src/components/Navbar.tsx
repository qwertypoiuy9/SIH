import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKisanFlow } from '../context/KisanFlowContext';
import { SUPPORTED_LANGUAGES } from '../translations';
import { Mic, Languages, LogOut, Phone } from 'lucide-react';
import { LanguageCode } from '../types';

export const Navbar: React.FC = () => {
  const { language, setLanguage, authSession, logoutUser, setIsVoiceAssistantOpen, setIsPhoneModalOpen } = useKisanFlow();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">

        {/* Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(authSession.isAuthenticated ? '/portal' : '/')}>
          <span className="text-2xl">🌾</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-stone-900 tracking-tight leading-none">KisanFlow</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">MSP 2026-27</span>
            </div>
            <p className="text-[10px] text-stone-500 font-medium">National Smart Mandi Procurement</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={() => setIsPhoneModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
            <Phone className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">📞 1800-425-4747</span>
          </button>

          <button onClick={() => setIsVoiceAssistantOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
            <Mic className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          <div className="flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-xl border border-stone-200">
            <Languages className="w-3.5 h-3.5 text-stone-500" />
            <select value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)} className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none cursor-pointer">
              {SUPPORTED_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
            </select>
          </div>

          {authSession.isAuthenticated && authSession.user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-block text-xs font-bold text-stone-700">{authSession.user.name}</span>
              <button onClick={() => logoutUser()} className="p-1.5 text-red-700 hover:bg-red-50 rounded-xl border border-red-200 cursor-pointer" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer">Login</button>
          )}
        </div>
      </div>
    </header>
  );
};
