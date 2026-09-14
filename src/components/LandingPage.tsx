import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKisanQ } from '../context/KisanFlowContext';
import { translations } from '../translations';
import {
  Sparkles, ArrowRight, ShieldCheck, CheckCircle2,
  Users, Building2, Landmark, Scale, CreditCard, Mic,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { language, setIsVoiceAssistantOpen } = useKisanQ();
  const navigate = useNavigate();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-16">
      {/* Official State Subheader */}
      <div className="bg-emerald-950 text-emerald-100 py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
              MSP PROCUREMENT 2026-27
            </span>
            <span>Department of Agricultural Marketing & Civil Supplies</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span>Toll-Free Helpline: <strong>1800-425-4747</strong></span>
            <span className="text-emerald-400">● Live Operations Active</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 bg-linear-to-b from-white via-emerald-50/40 to-stone-50 border-b border-stone-200">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>DIRECT DATABASE-DRIVEN SMART MANDI PLATFORM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            One Procurement System.<br />Every Farmer. Any Language.
          </h1>

          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto font-medium">
            Streamlining government crop procurement with secure token sequencing, live queue tracking, 5-stage mandi processing, and immediate Direct Benefit Transfer (DBT).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/login')}
            >
              <span>Access Portal (లాగిన్ అవ్వండి)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsVoiceAssistantOpen(true)}
              className="px-6 py-3.5 bg-white hover:bg-stone-100 text-emerald-900 border-2 border-emerald-800 font-bold text-sm rounded-2xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Mic className="w-4 h-4 text-emerald-700 animate-pulse" />
              <span>Try Multilingual AI Assistant</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 Role Portals Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl font-black text-center text-stone-900 mb-8">
          Dedicated Role-Based Operational Portals
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Farmer Portal Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-stone-900">1. Farmer Portal</h3>
              <p className="text-xs text-stone-500 mt-1">
                Book slot, receive sequential token starting at 1, track live queue position, 5-stage status and DBT credit.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl cursor-pointer"
            >
              Farmer Access →
            </button>
          </div>

          {/* Mandi Operator Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs hover:border-amber-500 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-stone-900">2. Mandi Operator</h3>
              <p className="text-xs text-stone-500 mt-1">
                Manage token roster, verify moisture and FAQ quality, record digital weighbridge weight, and generate official J-Forms.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl cursor-pointer"
            >
              Operator Access →
            </button>
          </div>

          {/* Government Officer Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs hover:border-blue-500 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold mb-4">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg text-stone-900">3. Government Officer</h3>
              <p className="text-xs text-stone-500 mt-1">
                District and state oversight, real-time bottleneck detection, centre load balancing, and DBT payment audit reports.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl cursor-pointer"
            >
              Officer Access →
            </button>
          </div>
        </div>
      </section>

      {/* 5-Stage Procurement Pipeline Graphic */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-linear-to-br from-stone-900 to-stone-950 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-5">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
              END-TO-END WORKFLOW
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-1">
              5-Stage Regulated Procurement Lifecycle
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              From arrival to direct bank credit — fully tracked and auditable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="font-mono text-amber-400 font-black block text-sm mb-1">01</span>
              <p className="font-bold">Gate Entry</p>
              <p className="text-[11px] text-stone-400 mt-1">Token check & vehicle verification</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="font-mono text-amber-400 font-black block text-sm mb-1">02</span>
              <p className="font-bold">Quality Check</p>
              <p className="text-[11px] text-stone-400 mt-1">Moisture meter & FAQ grading</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="font-mono text-amber-400 font-black block text-sm mb-1">03</span>
              <p className="font-bold">Weighing</p>
              <p className="text-[11px] text-stone-400 mt-1">Gross, tare and net quintals</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="font-mono text-amber-400 font-black block text-sm mb-1">04</span>
              <p className="font-bold">Bagging</p>
              <p className="text-[11px] text-stone-400 mt-1">50kg gunny bags & stitching</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <span className="font-mono text-amber-400 font-black block text-sm mb-1">05</span>
              <p className="font-bold">J-Form & DBT</p>
              <p className="text-[11px] text-stone-400 mt-1">Instant electronic sales receipt</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
