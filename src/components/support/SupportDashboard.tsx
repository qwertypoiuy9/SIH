import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import {
  Headphones,
  Search,
  Bot,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  MessageSquare,
  FileText,
  Home,
  User,
  Bell,
  Mic,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Send,
  ShieldAlert,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { SupportSidebarView } from '../../types';
import {
  analyzeSupportIssue,
  SupportAIAnalysis,
} from '../../services/aiAssistantService';

const ISSUE_TYPES = [
  'Queue & Slot Inquiry',
  'Token Not Found / Invalid',
  'Moisture / Quality Deduction Dispute',
  'Payment Delay / Bank Mismatch',
  'Mandi Gunny Bag Shortage',
  'J-Form Not Issued',
  'DBT Payment Not Credited',
  'Gate Entry Rejected',
  'Other Grievance',
];

const SEVERITY_COLORS: Record<string, { badge: string; border: string; bg: string }> = {
  LOW: { badge: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300', bg: 'bg-emerald-50' },
  MEDIUM: { badge: 'bg-amber-100 text-amber-800', border: 'border-amber-300', bg: 'bg-amber-50' },
  HIGH: { badge: 'bg-red-100 text-red-800', border: 'border-red-400', bg: 'bg-red-50' },
};

export const SupportDashboard: React.FC = () => {
  const {
    supportView,
    setSupportView,
    authSession,
    logoutUser,
    registrations,
    payments,
    language,
    setIsVoiceAssistantOpen,
  } = useKisanFlow();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Farmer lookup
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookedUpFarmer, setLookedUpFarmer] = useState<typeof registrations[0] | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Grievance form
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [grievanceText, setGrievanceText] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<SupportAIAnalysis | null>(null);
  const [ticketRef, setTicketRef] = useState('');

  // SMS send state
  const [smsSent, setSmsSent] = useState(false);
  const [customSms, setCustomSms] = useState('');

  // Stats
  const totalRegistrations = registrations.length;
  const activeCount = registrations.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;
  const completedCount = registrations.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length;

  // Farmer lookup handler
  const handleLookup = () => {
    setLookupError('');
    setLookedUpFarmer(null);
    const q = lookupQuery.trim();
    if (!q) return;
    const found = registrations.find(
      r => r.phone === q || r.farmer_id === q || r.farmer_id.includes(q) ||
        r.farmer_name.toLowerCase().includes(q.toLowerCase()) ||
        String(r.token_number) === q
    );
    if (found) {
      setLookedUpFarmer(found);
    } else {
      setLookupError('No farmer record found for "' + q + '". Try mobile number, name, or token number.');
    }
  };

  // AI Analysis handler
  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grievanceText.trim()) return;
    setIsAnalysing(true);
    setAnalysis(null);
    setSmsSent(false);

    const farmerPayment = lookedUpFarmer
      ? payments.find(p => p.farmer_id === lookedUpFarmer.farmer_id)
      : undefined;

    try {
      const result = await analyzeSupportIssue({
        issueType,
        grievanceText,
        farmerName: lookedUpFarmer?.farmer_name || 'Farmer',
        tokenNumber: lookedUpFarmer?.token_number,
        paymentStatus: farmerPayment?.status,
        paymentAmount: farmerPayment?.amount,
        currentStage: lookedUpFarmer?.current_stage,
        language,
      });
      setAnalysis(result);
      setCustomSms(result.draftSmsResponse);
      // Generate ticket reference
      setTicketRef(`TK-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`);
    } catch (err) {
      console.warn('Support AI error:', err);
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleSendSms = () => {
    setSmsSent(true);
    // In a real app this would call an SMS API
  };

  const navItems: { id: SupportSidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '🏠 Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'farmer_lookup', label: '🔍 Farmer Lookup', icon: <Search className="w-4 h-4" /> },
    { id: 'grievances', label: '📋 Grievances & Tickets', icon: <FileText className="w-4 h-4" /> },
    { id: 'ai_analysis', label: '🤖 AI Issue Analysis', icon: <Bot className="w-4 h-4" /> },
    { id: 'notifications', label: '🔔 Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'voice_assistant', label: '🎙️ Voice Assistant', icon: <Mic className="w-4 h-4" /> },
    { id: 'profile', label: '👤 Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900 font-sans">
      {/* MOBILE TOGGLE */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-2.5 bg-purple-800 text-white rounded-xl shadow-md cursor-pointer">
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-purple-950 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-purple-900">
          <div className="flex items-center gap-2 mb-1">
            <Headphones className="w-5 h-5 text-purple-400" />
            <span className="font-black text-lg tracking-tight text-white">KisanFlow</span>
            <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full font-bold uppercase">Support</span>
          </div>
          <p className="text-xs text-purple-400 font-medium">AI Helpline Agent Portal</p>
          <p className="text-[10px] text-purple-500 mt-0.5">1800-425-4747</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = supportView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice_assistant') { setIsVoiceAssistantOpen(true); }
                  else { setSupportView(item.id); }
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-purple-700 text-white shadow-sm font-bold' : 'text-purple-300 hover:bg-purple-900 hover:text-white'}`}
              >
                <div className="flex items-center gap-2.5">{item.icon}<span>{item.label}</span></div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-300" />}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-purple-900 bg-purple-950">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-purple-700 text-white font-bold flex items-center justify-center text-sm">
              {authSession.user?.name.charAt(0) || 'S'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{authSession.user?.name}</p>
              <p className="text-[10px] text-purple-400 truncate">{authSession.user?.employee_id || 'AGT-001'}</p>
            </div>
          </div>
          <button onClick={logoutUser} className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-900 cursor-pointer transition-all">
            <LogOut className="w-3.5 h-3.5" /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 min-h-screen space-y-6">

        {/* ═══════════════════════════════════════════════════════
            1. SUPPORT DASHBOARD
        ═══════════════════════════════════════════════════════ */}
        {supportView === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-300 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-purple-800" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-stone-900">AI Support Agent Dashboard</h1>
                  <p className="text-xs text-stone-500">Assisted services for low-literacy farmers · Helpline 1800-425-4747</p>
                </div>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Agent: READY / ACTIVE
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Total Registrations', value: totalRegistrations, color: 'text-stone-900', sub: 'In database' },
                { label: 'Active Farmers', value: activeCount, color: 'text-amber-700', sub: 'In queue or processing' },
                { label: 'Completed Today', value: completedCount, color: 'text-emerald-700', sub: 'J-Forms issued' },
                { label: 'AI Analysis Ready', value: '⚡', color: 'text-purple-700 text-3xl', sub: 'Gemini 2.5 Flash' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">{kpi.label}</span>
                  <span className={`text-3xl font-black mt-1 block ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[10px] text-stone-400">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* AI Capabilities Banner */}
            <div className="bg-gradient-to-r from-purple-950 to-stone-950 rounded-3xl p-6 border border-purple-900/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">AI Support Intelligence Engine</h3>
                  <p className="text-[11px] text-purple-300">Powered by Gemini 2.5 Flash + Multilingual Rule Engine</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { icon: '🔍', title: 'Smart Farmer Lookup', desc: 'Search by mobile, name, Aadhaar or token number' },
                  { icon: '🧠', title: 'AI Grievance Analysis', desc: 'Instant severity classification & root-cause detection' },
                  { icon: '📋', title: 'Resolution Steps', desc: 'Step-by-step resolution workflow generated by AI' },
                  { icon: '💬', title: 'Multilingual SMS Draft', desc: 'AI-written response in farmer\'s preferred language' },
                  { icon: '⚡', title: 'Escalation Detection', desc: 'Automatically flags cases requiring senior review' },
                  { icon: '📊', title: 'Live Context Lookup', desc: 'Real-time token, stage and payment data per farmer' },
                ].map((feat, i) => (
                  <div key={i} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                    <span className="text-lg">{feat.icon}</span>
                    <p className="text-xs font-bold text-white mt-1">{feat.title}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { view: 'farmer_lookup' as SupportSidebarView, icon: <Search className="w-5 h-5" />, title: 'Look Up Farmer', sub: 'Search by mobile, token or name', bg: 'bg-purple-100 text-purple-800', border: 'hover:border-purple-500' },
                { view: 'ai_analysis' as SupportSidebarView, icon: <Bot className="w-5 h-5" />, title: 'AI Issue Analysis', sub: 'Analyse & resolve grievances with Gemini', bg: 'bg-blue-100 text-blue-800', border: 'hover:border-blue-500' },
                { view: 'grievances' as SupportSidebarView, icon: <FileText className="w-5 h-5" />, title: 'All Registrations', sub: 'View full farmer database', bg: 'bg-emerald-100 text-emerald-800', border: 'hover:border-emerald-500' },
              ].map((action, i) => (
                <button key={i} onClick={() => setSupportView(action.view)} className={`p-5 bg-white rounded-2xl border border-stone-200 ${action.border} transition-all text-left shadow-sm cursor-pointer`}>
                  <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center mb-3`}>{action.icon}</div>
                  <h3 className="font-bold text-sm text-stone-900">{action.title}</h3>
                  <p className="text-xs text-stone-500 mt-1">{action.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            2. FARMER LOOKUP
        ═══════════════════════════════════════════════════════ */}
        {supportView === 'farmer_lookup' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">Farmer Record Lookup</h2>
              <p className="text-xs text-stone-500">Search by mobile number, token number, farmer name or Aadhaar</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex gap-2">
                <input
                  type="text" value={lookupQuery} onChange={(e) => setLookupQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="Enter mobile number, name, or token number..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  onClick={handleLookup}
                  className="px-5 py-2.5 bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Search className="w-4 h-4" /> Search
                </button>
              </div>

              {lookupError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {lookupError}
                </div>
              )}

              {lookedUpFarmer && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-base text-stone-900">{lookedUpFarmer.farmer_name}</h3>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">Token #{lookedUpFarmer.token_number}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {[
                        { label: 'Mobile', value: lookedUpFarmer.phone, mono: true },
                        { label: 'Village', value: lookedUpFarmer.village },
                        { label: 'District', value: lookedUpFarmer.district },
                        { label: 'Crop', value: `${lookedUpFarmer.crop} — ${lookedUpFarmer.quantity_quintals} Qtl` },
                        { label: 'Centre', value: lookedUpFarmer.centre_name || 'N/A' },
                        { label: 'Current Stage', value: lookedUpFarmer.current_stage.replace(/_/g, ' ') },
                      ].map((row, i) => (
                        <div key={i} className="bg-white rounded-xl p-2.5 border border-stone-200">
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">{row.label}</span>
                          <span className={`font-bold text-stone-900 ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                      <span className="text-xs text-stone-600">Procurement Status:</span>
                      <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full">{lookedUpFarmer.procurement_status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setSupportView('ai_analysis'); }}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white font-bold text-xs rounded-2xl cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    Continue to AI Issue Analysis for this Farmer
                  </button>
                </div>
              )}

              {!lookedUpFarmer && !lookupError && registrations.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-[10px] text-stone-400 uppercase font-bold">All Registered Farmers ({registrations.length})</p>
                  {registrations.slice(0, 10).map(r => (
                    <div
                      key={r.id}
                      onClick={() => setLookedUpFarmer(r)}
                      className="flex items-center justify-between p-3 bg-stone-50 hover:bg-purple-50 hover:border-purple-300 border border-stone-200 rounded-xl cursor-pointer transition-all text-xs"
                    >
                      <div>
                        <span className="font-bold text-stone-900">{r.farmer_name}</span>
                        <span className="text-stone-500 ml-2">{r.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-800">#{r.token_number}</span>
                        <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded-full">{r.current_stage.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))}
                  {registrations.length > 10 && <p className="text-[10px] text-stone-400 text-center">+ {registrations.length - 10} more — use search to filter</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            3. ALL REGISTRATIONS (GRIEVANCE CONTEXT)
        ═══════════════════════════════════════════════════════ */}
        {supportView === 'grievances' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-stone-900">All Farmer Registrations</h2>
                <p className="text-xs text-stone-500">Full database view for support context</p>
              </div>
              <span className="text-xs bg-purple-100 text-purple-900 font-bold px-3 py-1 rounded-full">{registrations.length} Total</span>
            </div>
            {registrations.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
                    <tr>
                      <th className="p-4">Token</th><th className="p-4">Farmer</th><th className="p-4">Mobile</th>
                      <th className="p-4">Crop</th><th className="p-4">Centre</th><th className="p-4">Stage</th><th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {registrations.map((r) => (
                      <tr key={r.id} className="hover:bg-purple-50">
                        <td className="p-4 font-mono font-black text-purple-800 text-sm">#{r.token_number}</td>
                        <td className="p-4 font-bold text-stone-900">{r.farmer_name}</td>
                        <td className="p-4 font-mono text-stone-500">{r.phone}</td>
                        <td className="p-4">{r.crop} ({r.quantity_quintals}Q)</td>
                        <td className="p-4 text-stone-600">{r.centre_name}</td>
                        <td className="p-4 font-bold text-amber-800">{r.current_stage.replace(/_/g, ' ')}</td>
                        <td className="p-4">
                          <button
                            onClick={() => { setLookedUpFarmer(r); setSupportView('ai_analysis'); }}
                            className="text-[10px] font-bold text-purple-700 hover:text-purple-900 border border-purple-300 hover:border-purple-500 px-2 py-1 rounded-lg cursor-pointer transition-all"
                          >
                            Analyse →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No registrations found.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            4. AI ISSUE ANALYSIS — CORE FEATURE
        ═══════════════════════════════════════════════════════ */}
        {supportView === 'ai_analysis' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">AI Issue Analysis & Resolution</h2>
              <p className="text-xs text-stone-500">Gemini 2.5 analyses the grievance, classifies severity, and suggests resolution steps</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Form */}
              <div className="lg:col-span-5 space-y-5">
                {/* Farmer Context Card */}
                {lookedUpFarmer ? (
                  <div className="bg-white rounded-3xl p-5 border border-purple-300 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-sm text-stone-900">{lookedUpFarmer.farmer_name}</h3>
                      <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full">Token #{lookedUpFarmer.token_number}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-stone-50 p-2 rounded-xl"><span className="text-[10px] text-stone-400 block uppercase">Mobile</span><span className="font-mono font-bold">{lookedUpFarmer.phone}</span></div>
                      <div className="bg-stone-50 p-2 rounded-xl"><span className="text-[10px] text-stone-400 block uppercase">Stage</span><span className="font-bold">{lookedUpFarmer.current_stage.replace(/_/g, ' ')}</span></div>
                      <div className="bg-stone-50 p-2 rounded-xl col-span-2"><span className="text-[10px] text-stone-400 block uppercase">Crop</span><span className="font-bold">{lookedUpFarmer.crop} — {lookedUpFarmer.quantity_quintals} Qtl at {lookedUpFarmer.centre_name}</span></div>
                    </div>
                    <button
                      onClick={() => setLookedUpFarmer(null)}
                      className="text-[10px] text-stone-500 hover:text-stone-700 cursor-pointer underline"
                    >
                      Clear farmer / use generic analysis
                    </button>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-3xl p-4 border border-dashed border-stone-300 text-center">
                    <p className="text-xs text-stone-500">No farmer selected.</p>
                    <button onClick={() => setSupportView('farmer_lookup')} className="text-xs text-purple-700 font-bold underline cursor-pointer mt-1">Look up a farmer first →</button>
                  </div>
                )}

                {/* Grievance Form */}
                <form onSubmit={handleAnalyse} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">Grievance Details</h3>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Issue Type</label>
                    <select
                      value={issueType} onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Farmer's Complaint (Verbatim or Summary)</label>
                    <textarea
                      required value={grievanceText} onChange={(e) => setGrievanceText(e.target.value)}
                      rows={4} placeholder="Describe the farmer's issue in detail..."
                      className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit" disabled={isAnalysing || !grievanceText.trim()}
                    className="w-full py-3 bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950 text-white font-bold text-xs rounded-2xl cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  >
                    {isAnalysing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analysing with Gemini AI...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 text-purple-300" /> Analyse with AI & Generate Resolution</>
                    )}
                  </button>
                </form>
              </div>

              {/* Right: AI Analysis Results */}
              <div className="lg:col-span-7 space-y-4">
                {isAnalysing && (
                  <div className="bg-gradient-to-r from-purple-950 to-stone-950 rounded-3xl p-8 border border-purple-900/50 flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">Gemini AI is analysing the grievance...</p>
                      <p className="text-xs text-purple-300 mt-1">Classifying severity · Generating resolution steps · Drafting SMS in {language.toUpperCase()}</p>
                    </div>
                  </div>
                )}

                {analysis && !isAnalysing && (
                  <div className="space-y-4">
                    {/* Ticket Reference */}
                    <div className="bg-white rounded-3xl p-4 border border-purple-300 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Ticket Reference</span>
                        <p className="font-black text-lg font-mono text-purple-800">{ticketRef}</p>
                      </div>
                      <span className={`text-xs font-black px-3 py-1.5 rounded-full ${SEVERITY_COLORS[analysis.severity]?.badge}`}>
                        {analysis.severity} SEVERITY
                      </span>
                    </div>

                    {/* Issue Summary */}
                    <div className={`bg-white rounded-3xl p-5 border ${SEVERITY_COLORS[analysis.severity]?.border || 'border-stone-200'} shadow-sm space-y-3`}>
                      <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                        <Bot className="w-4 h-4 text-purple-700" />
                        <span className="text-[11px] font-bold text-stone-700 uppercase">AI Issue Summary</span>
                        <span className={`ml-auto text-[9px] font-bold ${analysis.source === 'gemini' ? 'text-blue-600' : 'text-amber-600'}`}>
                          {analysis.source === 'gemini' ? '⚡ Gemini AI' : '🔷 Rule Engine'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed">{analysis.issueSummary}</p>

                      {/* Escalation warning */}
                      {analysis.escalationNeeded && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl p-3">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-800 font-semibold">Escalation recommended — this case requires senior officer review.</p>
                        </div>
                      )}
                    </div>

                    {/* Resolution Steps */}
                    <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                        <Zap className="w-4 h-4 text-blue-700" />
                        <span className="text-[11px] font-bold text-stone-700 uppercase">Suggested Resolution Steps</span>
                      </div>
                      <div className="space-y-2">
                        {analysis.suggestedResolution.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                            <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <p className="text-xs text-stone-700 leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI-Drafted SMS Response */}
                    <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                        <MessageSquare className="w-4 h-4 text-emerald-700" />
                        <span className="text-[11px] font-bold text-stone-700 uppercase">AI-Drafted SMS Response</span>
                        <span className="text-[10px] text-stone-400 ml-auto">Editable before sending</span>
                      </div>

                      <textarea
                        value={customSms} onChange={(e) => setCustomSms(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none bg-stone-50"
                      />

                      {smsSent ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-xl p-3">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <p className="text-xs text-emerald-800 font-semibold">SMS sent to farmer! Reference: {ticketRef}</p>
                        </div>
                      ) : (
                        <button
                          onClick={handleSendSms}
                          disabled={!customSms.trim()}
                          className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" /> Send SMS to Farmer · Ref: {ticketRef}
                        </button>
                      )}
                    </div>

                    {/* Reset */}
                    <button
                      onClick={() => { setAnalysis(null); setGrievanceText(''); setSmsSent(false); setCustomSms(''); }}
                      className="w-full py-2.5 border border-stone-300 text-stone-600 hover:bg-stone-100 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Analyse New Grievance
                    </button>
                  </div>
                )}

                {!analysis && !isAnalysing && (
                  <div className="bg-white rounded-3xl p-8 border border-dashed border-stone-300 text-center space-y-3">
                    <Bot className="w-10 h-10 text-stone-300 mx-auto" />
                    <p className="font-bold text-stone-900">AI Analysis Results</p>
                    <p className="text-xs text-stone-500">Fill in the grievance form and click "Analyse with AI" to see instant analysis, resolution steps, and an AI-drafted SMS response.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile */}
        {supportView === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-stone-900">Support Agent Profile</h2>
            <div className="space-y-3 text-xs">
              {[
                { label: 'Agent Name', value: authSession.user?.name },
                { label: 'Agent ID', value: authSession.user?.employee_id, mono: true },
                { label: 'Designation', value: authSession.user?.designation },
                { label: 'Helpline', value: '1800-425-4747' },
                { label: 'Access Level', value: 'AI Support Agent', color: 'text-purple-700' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-stone-500">{row.label}:</span>
                  <span className={`font-bold text-stone-900 ${row.mono ? 'font-mono' : ''} ${row.color || ''}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
