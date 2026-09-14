import React, { useState, useEffect, useCallback } from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import {
  Home,
  Users,
  Ticket,
  ListOrdered,
  Settings,
  Droplets,
  Scale,
  ShoppingBag,
  FileCheck,
  CreditCard,
  BarChart3,
  Bell,
  Mic,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Bot,
  Sparkles,
  Loader2,
  AlertCircle,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  OperatorSidebarView,
  ProcurementStage,
  ProcurementStatus,
  Registration,
} from '../../types';
import {
  getQualityCheckAdvice,
  getOperatorCopilotSummary,
  analyzeJForm,
  QualityAdvisorResult,
  OperatorCopilotSummary,
  JFormIntelligence,
} from '../../services/aiAssistantService';

export const OperatorDashboard: React.FC = () => {
  const {
    operatorView,
    setOperatorView,
    authSession,
    logoutUser,
    centres,
    registrations,
    refreshRegistrations,
    payments,
    updateRegistrationStage,
    setIsVoiceAssistantOpen,
    language,
  } = useKisanQ();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── Centre selection: use profile centre_id OR let operator pick ──────────
  const profileCentreId = authSession.user?.centre_id || '';
  const [selectedCentreId, setSelectedCentreId] = useState<string>(profileCentreId);

  // When centres load, auto-select if profile has a centre_id
  useEffect(() => {
    if (profileCentreId && !selectedCentreId) setSelectedCentreId(profileCentreId);
    else if (!selectedCentreId && centres.length > 0) setSelectedCentreId(centres[0].id);
  }, [centres, profileCentreId]);

  const operatorCentreId = selectedCentreId || (centres[0]?.id ?? '');
  const centre = centres.find(c => c.id === operatorCentreId) || centres[0];

  // Operator-centre registrations — ALL registrations for this centre
  const centreRegs = registrations.filter(r => r.centre_id === operatorCentreId);

  // Active queue: not completed or rejected
  const waitingQueue = centreRegs.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  );

  // Currently active farmer
  const activeFarmer = waitingQueue.find(r => r.procurement_status !== 'WAITING_FOR_GATE_ENTRY') || waitingQueue[0];

  const [selectedRegId, setSelectedRegId] = useState<string>('');
  const activeSelectedReg = centreRegs.find(r => r.id === selectedRegId) || activeFarmer;

  // Stage form state
  const [moisture, setMoisture] = useState<number>(13.5);
  const [qualityGrade, setQualityGrade] = useState<string>('Grade A (Premium)');
  const [grossWeight, setGrossWeight] = useState<number>(40);
  const [tareWeight, setTareWeight] = useState<number>(15);
  const [bagCount, setBagCount] = useState<number>(50);
  const [bottleneckDelay, setBottleneckDelay] = useState<number>(0);
  const [bottleneckRemarks, setBottleneckRemarks] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // ── AI QUALITY ADVISOR state ──
  const [qualityAdvice, setQualityAdvice] = useState<QualityAdvisorResult | null>(null);
  const [isLoadingQualityAI, setIsLoadingQualityAI] = useState(false);

  // ── AI COPILOT state ──
  const [copilot, setCopilot] = useState<OperatorCopilotSummary | null>(null);
  const [isLoadingCopilot, setIsLoadingCopilot] = useState(false);
  const [copilotLoaded, setCopilotLoaded] = useState(false);

  // ── AI J-FORM INTELLIGENCE state ──
  const [jFormAnalyses, setJFormAnalyses] = useState<Record<string, JFormIntelligence>>({});
  const [loadingJFormIds, setLoadingJFormIds] = useState<Set<string>>(new Set());

  // Metrics
  const todayRegistrations = centreRegs.length;
  const waitingCount = waitingQueue.filter(r => r.current_stage === 'GATE_ENTRY').length;
  const inProcessingCount = waitingQueue.filter(r => r.current_stage !== 'GATE_ENTRY').length;
  const completedCount = centreRegs.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length;
  const currentToken = activeFarmer?.token_number || 0;
  const nextToken = waitingQueue.length > 1 ? waitingQueue[1].token_number : 0;

  // ── Load AI Copilot on dashboard open ──
  const loadCopilot = useCallback(async () => {
    if (copilotLoaded || isLoadingCopilot) return;
    setIsLoadingCopilot(true);
    try {
      const summary = await getOperatorCopilotSummary({
        centreRegistrations: centreRegs,
        centreName: centre.name,
        operatorName: authSession.user?.name || 'Operator',
        capacity: centre.capacity_per_day,
      });
      setCopilot(summary);
      setCopilotLoaded(true);
    } catch (err) {
      console.warn('Copilot load error:', err);
    } finally {
      setIsLoadingCopilot(false);
    }
  }, [centreRegs.length, centre.name]);

  useEffect(() => {
    if (operatorView === 'dashboard') {
      loadCopilot();
    }
  }, [operatorView, loadCopilot]);

  // ── Run AI quality check advisor ──
  const runQualityAI = async () => {
    if (!activeSelectedReg) return;
    setIsLoadingQualityAI(true);
    setQualityAdvice(null);
    try {
      const result = await getQualityCheckAdvice({
        cropName: activeSelectedReg.crop,
        moisturePercent: moisture,
        grade: qualityGrade,
        quantity: activeSelectedReg.quantity_quintals,
        farmerName: activeSelectedReg.farmer_name,
      });
      setQualityAdvice(result);
    } catch (err) {
      console.warn('Quality AI error:', err);
    } finally {
      setIsLoadingQualityAI(false);
    }
  };

  // ── Analyse a completed J-Form ──
  const analyseJFormRecord = async (reg: Registration) => {
    if (loadingJFormIds.has(reg.id)) return;
    setLoadingJFormIds(prev => new Set(prev).add(reg.id));
    try {
      const result = await analyzeJForm({
        farmerName: reg.farmer_name,
        crop: reg.crop,
        quantityQuintals: reg.quantity_quintals,
        mspRate: 1950,
        totalAmount: reg.quantity_quintals * 1950,
        jFormNumber: `JF-2026-00${reg.token_number}`,
        centreName: centre.name,
        language,
      });
      setJFormAnalyses(prev => ({ ...prev, [reg.id]: result }));
    } catch (err) {
      console.warn('J-Form AI error:', err);
    } finally {
      setLoadingJFormIds(prev => { const s = new Set(prev); s.delete(reg.id); return s; });
    }
  };

  // Handle stage transition
  const handleUpdateStatus = async (stage: ProcurementStage, status: ProcurementStatus) => {
    if (!activeSelectedReg) return;
    setIsUpdating(true);
    try {
      await updateRegistrationStage(activeSelectedReg.id, stage, status, {
        delayMinutes: bottleneckDelay,
        bottleneckRemarks: qualityAdvice?.suggestedRemark || bottleneckRemarks,
        qualityCheck: {
          moisture_percentage: moisture,
          quality_result: qualityGrade,
          remarks: qualityAdvice?.suggestedRemark || 'Quality tested by Mandi Operator',
        },
        weighing: {
          gross_weight: grossWeight,
          tare_weight: tareWeight,
          net_weight: Math.max(0, grossWeight - tareWeight),
          remarks: 'Weighbridge calibrated & certified',
        },
        bagging: {
          number_of_bags: bagCount,
          labour_delay_reported: bottleneckDelay > 30,
          delay_reason: bottleneckRemarks,
        },
      });
      await refreshRegistrations();
      setQualityAdvice(null);
      setCopilotLoaded(false); // refresh copilot after state change
    } catch (err) {
      alert('Error updating status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCallNextFarmer = async () => {
    const nextInLine = waitingQueue.find(r => r.procurement_status === 'WAITING_FOR_GATE_ENTRY');
    if (!nextInLine) { alert('No waiting farmers in gate queue.'); return; }
    await updateRegistrationStage(nextInLine.id, 'GATE_ENTRY', 'GATE_ENTRY_VERIFIED', {
      bottleneckRemarks: 'Farmer called into Mandi Yard',
    });
    setCopilotLoaded(false);
  };

  const navItems: { id: OperatorSidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '🏠 Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'farmer_registrations', label: '👨‍🌾 Farmer Registrations', icon: <Users className="w-4 h-4" /> },
    { id: 'token_management', label: '🎫 Token Management', icon: <Ticket className="w-4 h-4" /> },
    { id: 'live_queue', label: '🚜 Live Queue', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'procurement_processing', label: '⚙️ Procurement Processing', icon: <Settings className="w-4 h-4" /> },
    { id: 'quality_moisture', label: '💧 Quality & Moisture', icon: <Droplets className="w-4 h-4" /> },
    { id: 'weighing', label: '⚖️ Weighing & Unloading', icon: <Scale className="w-4 h-4" /> },
    { id: 'bagging', label: '👜 Bagging & Gunny', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'j_forms', label: '📄 J-Forms & Receipts', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'payments', label: '💰 Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'reports', label: '📊 Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'notifications', label: '🔔 Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'voice_assistant', label: '🎙️ Voice Assistant', icon: <Mic className="w-4 h-4" /> },
    { id: 'profile', label: '👤 Profile', icon: <User className="w-4 h-4" /> },
  ];

  // ── PENDING APPROVAL CHECK ──
  if (authSession.user?.role === 'operator' && authSession.user?.designation !== 'APPROVED') {
    const isRejected = authSession.user?.designation === 'REJECTED';
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          {isRejected ? (
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          ) : (
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          )}
          
          <h2 className={`text-2xl font-black mb-2 ${isRejected ? 'text-red-800' : 'text-stone-800'}`}>
            {isRejected ? 'Application Rejected' : 'Pending Approval'}
          </h2>
          
          <p className="text-stone-600 mb-4">
            {isRejected 
              ? 'Your registration as a Mandi Operator has been rejected by the State Government.' 
              : 'Your registration as a Mandi Operator is currently pending approval from the State Government. You will be granted access once an official verifies and approves your account.'}
          </p>

          {isRejected && authSession.user?.rejection_reason && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6 text-left">
              <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider block mb-1">Reason for Rejection:</span>
              <p className="text-sm text-red-900">{authSession.user.rejection_reason}</p>
            </div>
          )}

          <button onClick={logoutUser} className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl transition-colors mt-2 cursor-pointer">
            Log Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900 font-sans">
      {/* MOBILE TOGGLE */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2.5 bg-amber-800 text-white rounded-xl shadow-md cursor-pointer"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-stone-950 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-stone-800">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            <span className="font-black text-lg tracking-tight text-white">KisanQ</span>
            <span className="text-[10px] bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">Operator</span>
          </div>
          {/* Centre picker */}
          {centres.length > 1 ? (
            <select
              value={selectedCentreId}
              onChange={e => setSelectedCentreId(e.target.value)}
              className="w-full mt-1 bg-stone-800 border border-stone-700 text-amber-200 text-[11px] font-semibold rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {centres.map(c => (
                <option key={c.id} value={c.id} className="bg-stone-900">{c.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-stone-400 truncate mt-1">{centre?.name || 'Loading...'}</p>
          )}
        </div>


        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = operatorView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice_assistant') { setIsVoiceAssistantOpen(true); }
                  else { setOperatorView(item.id); }
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-amber-700 text-white shadow-sm font-bold' : 'text-stone-300 hover:bg-stone-900 hover:text-white'}`}
              >
                <div className="flex items-center gap-2.5">{item.icon}<span>{item.label}</span></div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-300" />}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-amber-700 text-stone-950 font-bold flex items-center justify-center text-sm">
              {authSession.user?.name.charAt(0) || 'O'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{authSession.user?.name}</p>
              <p className="text-[10px] text-amber-400 truncate">Emp: {authSession.user?.employee_id || 'MND-01'}</p>
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
            1. DASHBOARD
        ═══════════════════════════════════════════════════════ */}
        {operatorView === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-6">

            {/* Centre Status Bar */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900">{centre.name}</h1>
                  <p className="text-xs text-stone-500">District: {centre.district} · Active Counters: {centre.counters_active} · Capacity: {centre.capacity_per_day}/day</p>
                </div>
              </div>
              <button
                onClick={handleCallNextFarmer}
                className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md cursor-pointer flex items-center gap-2 transition-all"
              >
                <RotateCw className="w-4 h-4 text-amber-300" />
                <span>CALL NEXT FARMER</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              {[
                { label: 'Registered Today', value: todayRegistrations, color: 'text-stone-900', sub: 'Total in Supabase' },
                { label: 'Waiting at Gate', value: waitingCount, color: 'text-amber-700', sub: 'Pending Gate Entry' },
                { label: 'Being Processed', value: inProcessingCount, color: 'text-blue-700', sub: 'Active in yard' },
                { label: 'Completed', value: completedCount, color: 'text-emerald-700', sub: 'J-Forms Issued' },
                { label: 'Current Token', value: currentToken > 0 ? `#${currentToken}` : '—', color: 'text-emerald-800 font-mono', sub: 'At active stage' },
                { label: 'Next Token', value: nextToken > 0 ? `#${nextToken}` : '—', color: 'text-stone-700 font-mono', sub: 'Next in line' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">{kpi.label}</span>
                  <span className={`text-3xl font-black mt-1 block ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[10px] text-stone-400">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* ── AI COPILOT PANEL ── */}
            <div className="bg-gradient-to-r from-amber-950 to-stone-950 rounded-3xl p-6 border border-amber-900/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">AI Operator Copilot</h3>
                    <p className="text-[11px] text-amber-400">Powered by Gemini 2.5 Flash</p>
                  </div>
                </div>
                <button
                  onClick={() => { setCopilotLoaded(false); loadCopilot(); }}
                  disabled={isLoadingCopilot}
                  className="text-[10px] font-bold text-amber-300 hover:text-white border border-amber-700 hover:border-amber-400 px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isLoadingCopilot ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {isLoadingCopilot ? 'Analysing...' : 'Refresh AI Summary'}
                </button>
              </div>

              {isLoadingCopilot && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  <span className="text-sm text-amber-200">AI is analysing today's operations...</span>
                </div>
              )}

              {copilot && !isLoadingCopilot && (
                <div className="space-y-4">
                  {/* Daily Summary */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <p className="text-xs text-stone-300 leading-relaxed">{copilot.dailySummary}</p>
                  </div>

                  {/* Capacity Warning */}
                  {copilot.capacityWarning && (
                    <div className="flex items-start gap-2.5 bg-red-900/40 rounded-2xl p-3.5 border border-red-700/60">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-200 font-semibold">{copilot.capacityWarning}</p>
                    </div>
                  )}

                  {/* Next Farmer Suggestion */}
                  <div className="flex items-start gap-2.5 bg-emerald-900/40 rounded-2xl p-3.5 border border-emerald-700/60">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-200 font-semibold">{copilot.nextFarmerSuggestion}</p>
                  </div>

                  {/* Urgent Flags */}
                  {copilot.urgentFlags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Urgent Flags</p>
                      {copilot.urgentFlags.map((flag, i) => (
                        <div key={i} className="flex items-start gap-2 bg-amber-900/30 rounded-xl p-2.5 border border-amber-700/40">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-100">{flag}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[10px] text-stone-500 flex items-center gap-1">
                    <span className={`font-bold ${copilot.source === 'gemini' ? 'text-blue-400' : 'text-amber-500'}`}>
                      {copilot.source === 'gemini' ? '⚡ Gemini AI' : '🔷 Rule Engine'}
                    </span>
                    · Last updated just now
                  </p>
                </div>
              )}

              {!copilot && !isLoadingCopilot && (
                <p className="text-xs text-stone-400 italic">Click "Refresh AI Summary" to load today's operational analysis.</p>
              )}
            </div>

            {/* Queue + Stage Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Queue Table */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-bold text-sm text-stone-900">Mandi Queue & Stage Control</h3>
                  <span className="text-xs text-stone-500">{waitingQueue.length} farmers in yard</span>
                </div>

                {waitingQueue.length > 0 ? (
                  <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                    {waitingQueue.map((r) => {
                      const isSelected = activeSelectedReg?.id === r.id;
                      const isLate = (r.delay_minutes || 0) > 60;
                      return (
                        <div
                          key={r.id}
                          onClick={() => { setSelectedRegId(r.id); setQualityAdvice(null); }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer my-1 flex items-center justify-between ${isSelected ? 'bg-amber-50 border-amber-400 shadow-sm' : 'bg-white border-stone-100 hover:border-stone-300'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-lg text-emerald-800">#{r.token_number}</span>
                            <div>
                              <p className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                                {r.farmer_name}
                                {isLate && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">DELAYED</span>}
                              </p>
                              <p className="text-[11px] text-stone-500">{r.crop} · {r.quantity_quintals} Qtl · {r.vehicle_number}</p>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-bold text-amber-800 block text-[11px]">{r.current_stage.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-stone-400 font-mono">{r.procurement_status.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-stone-400">No farmers currently in the waiting queue.</div>
                )}
              </div>

              {/* Right: 5-Stage Control + AI Quality Advisor */}
              <div className="lg:col-span-5 space-y-4">
                {activeSelectedReg ? (
                  <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                    <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">OPERATOR CONTROLLER</span>
                        <h3 className="font-black text-base text-stone-900">Token #{activeSelectedReg.token_number} — {activeSelectedReg.farmer_name}</h3>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                        {activeSelectedReg.crop} ({activeSelectedReg.quantity_quintals}Q)
                      </span>
                    </div>

                    {/* Stage 1: Gate Entry */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-800">Stage 1: Gate Entry</span>
                        <span className="text-[10px] font-mono text-stone-500">Ideal: 5m</span>
                      </div>
                      <button
                        onClick={() => handleUpdateStatus('GATE_ENTRY', 'GATE_ENTRY_VERIFIED')}
                        disabled={isUpdating}
                        className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        Verify Gate Entry ✓
                      </button>
                    </div>

                    {/* Stage 2: Quality & Moisture — with AI ADVISOR */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 2: Quality & Moisture</span>
                        <span className="text-[10px] font-mono text-stone-500">FAQ ≤ 17%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 block">Moisture (%)</label>
                          <input
                            type="number" step="0.1" value={moisture}
                            onChange={(e) => { setMoisture(Number(e.target.value)); setQualityAdvice(null); }}
                            className="w-full p-1.5 rounded-lg border border-stone-300 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block">FAQ Grade</label>
                          <select
                            value={qualityGrade}
                            onChange={(e) => { setQualityGrade(e.target.value); setQualityAdvice(null); }}
                            className="w-full p-1.5 rounded-lg border border-stone-300 text-xs"
                          >
                            <option value="Grade A (Premium)">Grade A (Premium)</option>
                            <option value="FAQ (Fair Average Quality)">FAQ Standard</option>
                            <option value="Grade B">Grade B</option>
                          </select>
                        </div>
                      </div>

                      {/* AI Advisor Button */}
                      <button
                        onClick={runQualityAI}
                        disabled={isLoadingQualityAI}
                        className="w-full py-1.5 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {isLoadingQualityAI ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing with AI...</>
                        ) : (
                          <><Sparkles className="w-3.5 h-3.5 text-blue-300" /> Ask AI Quality Advisor</>
                        )}
                      </button>

                      {/* AI Quality Result Card */}
                      {qualityAdvice && (
                        <div className={`rounded-2xl p-3 border space-y-1.5 ${
                          qualityAdvice.decision === 'APPROVE'
                            ? 'bg-emerald-50 border-emerald-300'
                            : qualityAdvice.decision === 'BORDERLINE'
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-red-50 border-red-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-black text-xs flex items-center gap-1 ${
                              qualityAdvice.decision === 'APPROVE' ? 'text-emerald-800' :
                              qualityAdvice.decision === 'BORDERLINE' ? 'text-amber-800' : 'text-red-800'
                            }`}>
                              {qualityAdvice.decision === 'APPROVE' ? '✓ APPROVE' : qualityAdvice.decision === 'BORDERLINE' ? '⚠ BORDERLINE' : '✗ REJECT'}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              {qualityAdvice.confidence}% confidence ·
                              <span className={`ml-1 font-bold ${qualityAdvice.source === 'gemini' ? 'text-blue-600' : 'text-amber-600'}`}>
                                {qualityAdvice.source === 'gemini' ? '⚡ Gemini' : '🔷 Rules'}
                              </span>
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-700 leading-relaxed">{qualityAdvice.suggestedRemark}</p>
                          <p className="text-[10px] text-stone-500 italic">{qualityAdvice.reasoning}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus('QUALITY_CHECK', 'QUALITY_CHECK_COMPLETED')}
                          disabled={isUpdating}
                          className="flex-1 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                        >
                          Approve Quality ✓
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('QUALITY_CHECK', 'QUALITY_REJECTED')}
                          disabled={isUpdating}
                          className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Stage 3: Weighing */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 3: Weighing & Unloading</span>
                        <span className="text-[10px] font-mono text-stone-500">Weighbridge</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 block">Gross Weight (Qtl)</label>
                          <input type="number" value={grossWeight} onChange={(e) => setGrossWeight(Number(e.target.value))} className="w-full p-1.5 rounded-lg border border-stone-300 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block">Tare Weight (Qtl)</label>
                          <input type="number" value={tareWeight} onChange={(e) => setTareWeight(Number(e.target.value))} className="w-full p-1.5 rounded-lg border border-stone-300 text-xs" />
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpdateStatus('WEIGHING', 'WEIGHING_COMPLETED')}
                        disabled={isUpdating}
                        className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        Record Weighment ({Math.max(0, grossWeight - tareWeight)} Qtl Net) ✓
                      </button>
                    </div>

                    {/* Stage 4: Bagging */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 4: Bagging & Bardana</span>
                        <span className="text-[10px] font-mono text-stone-500">50kg Jute</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" value={bagCount} onChange={(e) => setBagCount(Number(e.target.value))} placeholder="No. of bags" className="flex-1 p-1.5 rounded-lg border border-stone-300 text-xs" />
                        <button
                          onClick={() => handleUpdateStatus('BAGGING', 'BAGGING_COMPLETED')}
                          disabled={isUpdating}
                          className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                        >
                          Complete Bagging ✓
                        </button>
                      </div>
                    </div>

                    {/* Stage 5: J-Form & Complete */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 5: J-Form & Completion</span>
                        <span className="text-[10px] font-mono text-stone-500">Auto-triggers DBT</span>
                      </div>
                      <button
                        onClick={() => handleUpdateStatus('COMPLETED', 'PROCUREMENT_COMPLETED')}
                        disabled={isUpdating}
                        className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Generate Official J-Form & Complete Procurement ✓
                      </button>
                    </div>

                    {/* Bottleneck Remarks */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <span className="font-bold text-stone-700 text-[11px] uppercase">Delay / Bottleneck Remarks</span>
                      <div className="flex gap-2">
                        <input
                          type="number" value={bottleneckDelay} onChange={(e) => setBottleneckDelay(Number(e.target.value))}
                          placeholder="Delay mins" className="w-20 p-1.5 rounded-lg border border-stone-300 text-xs"
                        />
                        <input
                          type="text" value={bottleneckRemarks} onChange={(e) => setBottleneckRemarks(e.target.value)}
                          placeholder="Remarks (optional)..." className="flex-1 p-1.5 rounded-lg border border-stone-300 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center text-xs text-stone-400">
                    Select a farmer from the queue table to control their procurement stages.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            2. ALL BOOKINGS / REGISTRATIONS TABLE
        ═══════════════════════════════════════════════════════ */}
        {(operatorView === 'farmer_registrations' || operatorView === 'all_bookings' || operatorView === 'token_management' || operatorView === 'live_queue') && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-xl font-black text-stone-900">All Farmer Registrations</h2>
                <p className="text-xs text-stone-500">Centre: <span className="font-bold text-amber-700">{centre?.name || 'All Centres'}</span> · Live from Supabase</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">{centreRegs.length} registrations</span>
                <button
                  onClick={() => refreshRegistrations()}
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 border border-stone-300 hover:border-stone-500 px-3 py-1.5 rounded-xl cursor-pointer transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            </div>
            {centreRegs.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
                    <tr>
                      <th className="p-4">Token</th><th className="p-4">Farmer Name</th><th className="p-4">Mobile</th>
                      <th className="p-4">Crop</th><th className="p-4">Quantity</th><th className="p-4">Vehicle</th>
                      <th className="p-4">Stage</th><th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {centreRegs.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50 cursor-pointer" onClick={() => { setSelectedRegId(r.id); setOperatorView('procurement_processing'); }}>
                        <td className="p-4 font-mono font-black text-emerald-800 text-sm">#{r.token_number}</td>
                        <td className="p-4 font-bold text-stone-900">{r.farmer_name}</td>
                        <td className="p-4 font-mono text-stone-500">{r.phone}</td>
                        <td className="p-4">{r.crop}</td>
                        <td className="p-4 font-bold">{r.quantity_quintals} Qtl</td>
                        <td className="p-4 font-mono text-stone-500">{r.vehicle_number}</td>
                        <td className="p-4 font-bold text-amber-800">{r.current_stage.replace(/_/g, ' ')}</td>
                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.procurement_status === 'PROCUREMENT_COMPLETED' ? 'bg-emerald-100 text-emerald-700' : r.procurement_status === 'QUALITY_REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{r.procurement_status.replace(/_/g, ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
                <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                  <Users className="w-7 h-7 text-amber-500" />
                </div>
                <p className="font-bold text-stone-900 text-sm">No registrations found for this centre</p>
                <p className="text-xs text-stone-500">Centre: <span className="font-semibold">{centre?.name}</span></p>
                <p className="text-xs text-stone-400">Farmers who book a slot at this centre will appear here automatically via Supabase Realtime.</p>
                <button onClick={() => refreshRegistrations()} className="mt-2 text-xs font-bold text-amber-700 underline cursor-pointer">Click to refresh</button>
              </div>
            )}
          </div>
        )}


        {/* ═══════════════════════════════════════════════════════
            3. J-FORMS WITH AI INTELLIGENCE
        ═══════════════════════════════════════════════════════ */}
        {operatorView === 'j_forms' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">Electronic J-Forms & Receipts</h2>
              <p className="text-xs text-stone-500">Official sales receipts with AI document intelligence</p>
            </div>

            {centreRegs.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length > 0 ? (
              <div className="space-y-4">
                {centreRegs.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').map(r => {
                  const analysis = jFormAnalyses[r.id];
                  const isLoading = loadingJFormIds.has(r.id);
                  const totalAmount = r.quantity_quintals * 1950;

                  return (
                    <div key={r.id} className="bg-white rounded-3xl p-6 border border-emerald-300 shadow-sm space-y-4">
                      {/* J-Form header */}
                      <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold">OFFICIAL J-FORM RECEIPT</span>
                          <h4 className="font-bold text-stone-900">JF-2026-00{r.token_number}</h4>
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">COMPLETED ✓</span>
                      </div>

                      {/* J-Form details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-stone-500">Farmer:</span><p className="font-bold text-stone-900">{r.farmer_name}</p></div>
                        <div><span className="text-stone-500">Quantity:</span><p className="font-bold text-stone-900">{r.quantity_quintals} Quintals</p></div>
                        <div><span className="text-stone-500">Total MSP:</span><p className="text-lg font-black text-emerald-800">₹{totalAmount}</p></div>
                        <div><span className="text-stone-500">Payment:</span><p className="font-bold text-blue-700">PFMS Clearing</p></div>
                      </div>

                      {/* AI Intelligence section */}
                      {!analysis && (
                        <button
                          onClick={() => analyseJFormRecord(r)}
                          disabled={isLoading}
                          className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white rounded-2xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        >
                          {isLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Analysing J-Form with AI...</>
                          ) : (
                            <><Sparkles className="w-4 h-4 text-blue-300" /> Analyse with AI — Generate Farmer Summary & Detect Anomalies</>
                          )}
                        </button>
                      )}

                      {analysis && (
                        <div className="space-y-3 bg-stone-50 rounded-2xl p-4 border border-stone-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="w-4 h-4 text-blue-700" />
                            <span className="text-[11px] font-bold text-stone-700 uppercase">AI Document Intelligence</span>
                            <span className={`text-[9px] font-bold ml-auto ${analysis.source === 'gemini' ? 'text-blue-600' : 'text-amber-600'}`}>
                              {analysis.source === 'gemini' ? '⚡ Gemini' : '🔷 Rules'}
                            </span>
                          </div>

                          {/* Receipt Summary */}
                          <div className="bg-white rounded-xl p-3 border border-stone-200">
                            <p className="text-[11px] text-stone-600 leading-relaxed">{analysis.receiptSummary}</p>
                          </div>

                          {/* Farmer message (in selected language) */}
                          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                            <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">Farmer-Friendly Message</p>
                            <p className="text-xs text-emerald-900 leading-relaxed">{analysis.farmerMessage}</p>
                          </div>

                          {/* Anomaly detection */}
                          {analysis.anomalies.length > 0 ? (
                            <div className="bg-red-50 rounded-xl p-3 border border-red-200 space-y-1.5">
                              <p className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Anomalies Detected</p>
                              {analysis.anomalies.map((a, i) => (
                                <p key={i} className="text-[11px] text-red-800">• {a}</p>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                              <p className="text-[11px] text-emerald-800 font-semibold">No anomalies detected — J-Form is consistent with procurement records.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No J-Forms issued yet.</p>
                <p className="text-xs text-stone-500 mt-1">Complete a farmer's procurement cycle to issue the J-Form.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            4. PAYMENTS
        ═══════════════════════════════════════════════════════ */}
        {operatorView === 'payments' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">Mandi Payment Disbursements</h2>
              <p className="text-xs text-stone-500">Real-time payment audit records</p>
            </div>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-900 text-sm">{p.transaction_id}</span>
                      <p className="text-stone-500">{p.quantity} Quintals · Amount: ₹{p.amount}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-full">{p.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No payment information available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {operatorView === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-stone-900">Operator Profile</h2>
            <div className="space-y-3 text-xs">
              {[
                { label: 'Name', value: authSession.user?.name },
                { label: 'Employee ID', value: authSession.user?.employee_id, mono: true },
                { label: 'Assigned Centre', value: centre.name },
                { label: 'Role', value: 'Mandi Operator', bold: true, color: 'text-amber-700' },
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
