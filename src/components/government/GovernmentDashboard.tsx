import React, { useState, useEffect, useCallback } from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import {
  Landmark,
  Users,
  Building,
  ListOrdered,
  Activity,
  CreditCard,
  BarChart3,
  AlertTriangle,
  Bell,
  Mic,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Clock,
  CheckCircle2,
  Bot,
  Sparkles,
  Loader2,
  TrendingUp,
  ShieldAlert,
  Zap,
  RefreshCw,
  Phone,
  Mail,
} from 'lucide-react';
import { GovernmentSidebarView, UserProfile } from '../../types';
import { getBottleneckPredictions, BottleneckPrediction } from '../../services/aiAssistantService';
import { getAllOperators, approveOperator } from '../../utils/supabaseAuth';
import { WeatherDashboard } from '../weather/WeatherDashboard';

const SEVERITY_STYLES: Record<BottleneckPrediction['severity'], { badge: string; border: string; bg: string; icon: string }> = {
  LOW: { badge: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300', bg: 'bg-emerald-50', icon: '🟢' },
  MEDIUM: { badge: 'bg-amber-100 text-amber-800', border: 'border-amber-300', bg: 'bg-amber-50', icon: '🟡' },
  HIGH: { badge: 'bg-orange-100 text-orange-800', border: 'border-orange-400', bg: 'bg-orange-50', icon: '🟠' },
  CRITICAL: { badge: 'bg-red-100 text-red-800', border: 'border-red-400', bg: 'bg-red-50', icon: '🔴' },
};

export const GovernmentDashboard: React.FC = () => {
  const {
    govtView,
    setGovtView,
    authSession,
    logoutUser,
    centres,
    registrations,
    payments,
    setIsVoiceAssistantOpen,
  } = useKisanQ();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Real database metrics
  const totalRegistrations = registrations.length;
  const totalCompleted = registrations.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length;
  const totalWaiting = registrations.filter(r => r.current_stage === 'GATE_ENTRY').length;
  const totalProcessing = registrations.filter(
    r => r.current_stage !== 'GATE_ENTRY' &&
      r.procurement_status !== 'PROCUREMENT_COMPLETED' &&
      r.procurement_status !== 'QUALITY_REJECTED'
  ).length;
  const totalQuantityQuintals = registrations
    .filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED')
    .reduce((acc, r) => acc + (r.quantity_quintals || 0), 0);
  const totalDisbursedMSP = totalQuantityQuintals * 1950;

  // ── AI Bottleneck Prediction state ──
  const [predictions, setPredictions] = useState<BottleneckPrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [operatorsList, setOperatorsList] = useState<UserProfile[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [predictionsLoaded, setPredictionsLoaded] = useState(false);
  const [predictionTimestamp, setPredictionTimestamp] = useState<string>('');

  // Fetch Operator Approvals
  const fetchOperators = useCallback(async () => {
    setLoadingOperators(true);
    const ops = await getAllOperators();
    setOperatorsList(ops);
    setLoadingOperators(false);
  }, []);

  useEffect(() => {
    if (govtView === 'operator_approvals' || govtView === 'operators') {
      fetchOperators();
    }
  }, [govtView, fetchOperators]);

  const handleApproveOperator = async (userId: string) => {
    const targetOp = operatorsList.find(op => op.id === userId);
    if (targetOp) {
      const alreadyApproved = operatorsList.find(op => op.centre_id === targetOp.centre_id && op.designation === 'APPROVED');
      if (alreadyApproved) {
        alert('This procurement centre already has an approved operator. Only one operator is allowed per centre.');
        return;
      }
    }

    const success = await approveOperator(userId);
    if (success) {
      setOperatorsList(prev => prev.map(op => op.id === userId ? { ...op, designation: 'APPROVED' } : op));
    }
  };

  const loadPredictions = useCallback(async () => {
    setIsLoadingPredictions(true);
    try {
      const results = await getBottleneckPredictions({ registrations, centres });
      setPredictions(results);
      setPredictionsLoaded(true);
      setPredictionTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('Bottleneck prediction error:', err);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, [registrations.length, centres.length]);

  useEffect(() => {
    if (govtView === 'bottlenecks' && !predictionsLoaded) {
      loadPredictions();
    }
  }, [govtView, predictionsLoaded, loadPredictions]);

  const navItems: { id: GovernmentSidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '🏠 Overview', icon: <Landmark className="w-4 h-4" /> },
    { id: 'farmers', label: '🌾 Farmers', icon: <Users className="w-4 h-4" /> },
    { id: 'operators', label: '👷 Mandi Operators', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'operator_approvals', label: '✅ Operator Approvals', icon: <CheckCircle2 className="w-4 h-4 text-amber-400" /> },
    { id: 'live_queue', label: '⏱️ Live Queues', icon: <Clock className="w-4 h-4" /> },
    { id: 'all_registrations', label: '📋 All Registrations', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'procurement_monitoring', label: '⚙️ Procurement Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'payments', label: '💰 Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'reports_analytics', label: '📊 Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'bottlenecks', label: '🚨 AI Bottleneck Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'notifications', label: '🔔 Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'voice_assistant', label: '🎙️ Voice Assistant', icon: <Mic className="w-4 h-4" /> },
    { id: 'profile', label: '👤 Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900 font-sans">
      {/* MOBILE TOGGLE */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="p-2.5 bg-blue-900 text-white rounded-xl shadow-md cursor-pointer">
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-5 h-5 text-blue-400" />
            <span className="font-black text-lg tracking-tight text-white">KisanQ</span>
            <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full font-bold uppercase">Govt</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">State Command Portal</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = govtView === item.id;
            const hasPrediction = item.id === 'bottlenecks' && predictions.some(p => p.severity === 'HIGH' || p.severity === 'CRITICAL');
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice_assistant') { setIsVoiceAssistantOpen(true); }
                  else { setGovtView(item.id); }
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive ? 'bg-blue-700 text-white shadow-sm font-bold' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
              >
                <div className="flex items-center gap-2.5">{item.icon}<span>{item.label}</span></div>
                <div className="flex items-center gap-1">
                  {hasPrediction && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-300" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-sm">
              {authSession.user?.name.charAt(0) || 'G'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{authSession.user?.name}</p>
              <p className="text-[10px] text-blue-300 truncate">{authSession.user?.district || 'State HQ'}</p>
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
            1. STATE OVERVIEW
        ═══════════════════════════════════════════════════════ */}
        {govtView === 'overview' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">State Procurement Operations Command</h1>
                <p className="text-xs text-stone-500">Live supervision of farmers, mandi centres & direct benefit transfers</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-900 font-bold px-3 py-1.5 rounded-full border border-blue-200">Official Government Oversight</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {[
                { label: 'Registered Farmers', value: totalRegistrations, color: 'text-stone-900', sub: 'Total in Database' },
                { label: 'Active in Yard', value: totalProcessing, color: 'text-blue-700', sub: 'Across all centres' },
                { label: 'Waiting at Gate', value: totalWaiting, color: 'text-amber-700', sub: 'Pending verification' },
                { label: 'Completed Today', value: totalCompleted, color: 'text-emerald-800', sub: 'J-Forms issued' },
                { label: 'Procured Quantity', value: `${totalQuantityQuintals} Qtl`, color: 'text-stone-900', sub: 'Weighbridge recorded' },
                { label: 'Disbursed MSP', value: `₹${totalDisbursedMSP.toLocaleString()}`, color: 'text-emerald-800', sub: 'Direct Benefit Transfer' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                  <span className="text-stone-500 font-semibold block text-[10px] uppercase">{kpi.label}</span>
                  <span className={`text-2xl font-black mt-1 block ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[10px] text-stone-400">{kpi.sub}</span>
                </div>
              ))}
            </div>

            {/* Centre Monitoring – Compact Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-stone-900">Procurement Centres Under Jurisdiction</h3>
                <span className="text-xs text-stone-500 font-semibold">{centres.length} Centres</span>
              </div>
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase">
                    <tr>
                      <th className="p-3 text-left font-bold">Centre Name</th>
                      <th className="p-3 text-left font-bold">District</th>
                      <th className="p-3 text-right font-bold">Bookings</th>
                      <th className="p-3 text-right font-bold">Queue</th>
                      <th className="p-3 text-right font-bold">Load</th>
                      <th className="p-3 text-left font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {centres.map((c) => {
                      const centreCount = registrations.filter(r => r.centre_id === c.id).length;
                      const waiting = registrations.filter(
                        r => r.centre_id === c.id && r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
                      ).length;
                      const loadPct = Math.min(100, Math.round((waiting / c.capacity_per_day) * 100));
                      return (
                        <tr key={c.id} className="hover:bg-stone-50">
                          <td className="p-3 font-bold text-stone-900">{c.name}</td>
                          <td className="p-3 text-stone-500">{c.district}</td>
                          <td className="p-3 text-right font-bold text-stone-900">{centreCount}</td>
                          <td className="p-3 text-right font-bold text-amber-700">{waiting}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-16 bg-stone-200 rounded-full h-1.5 overflow-hidden">
                                <div className={`h-1.5 rounded-full ${loadPct >= 80 ? 'bg-red-500' : loadPct >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${loadPct}%` }} />
                              </div>
                              <span className={`font-bold ${loadPct >= 80 ? 'text-red-700' : loadPct >= 50 ? 'text-amber-700' : 'text-emerald-700'}`}>{loadPct}%</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${loadPct >= 80 ? 'bg-red-100 text-red-800' : loadPct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            2. ALL REGISTRATIONS TABLE
        ═══════════════════════════════════════════════════════ */}
        {(govtView === 'all_registrations' || govtView === 'farmers' || govtView === 'live_queue' || govtView === 'procurement_monitoring') && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-stone-900">All State Procurement Registrations</h2>
                <p className="text-xs text-stone-500">Live multi-centre database records from Supabase</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-900 font-bold px-3 py-1 rounded-full">{registrations.length} Total</span>
            </div>
            {registrations.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-auto shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
                    <tr>
                      <th className="p-4">Token</th><th className="p-4">Farmer</th><th className="p-4">Centre</th>
                      <th className="p-4">Crop</th><th className="p-4">Quantity</th><th className="p-4">Stage</th><th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {registrations.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50">
                        <td className="p-4 font-mono font-black text-blue-800 text-sm">#{r.token_number}</td>
                        <td className="p-4 font-bold text-stone-900">{r.farmer_name}</td>
                        <td className="p-4 text-stone-600">{r.centre_name}</td>
                        <td className="p-4">{r.crop}</td>
                        <td className="p-4 font-bold">{r.quantity_quintals} Qtl</td>
                        <td className="p-4 font-bold text-amber-800">{r.current_stage.replace(/_/g, ' ')}</td>
                        <td className="p-4"><span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">{r.procurement_status.replace(/_/g, ' ')}</span></td>
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
            3. AI BOTTLENECK PREDICTIONS
        ═══════════════════════════════════════════════════════ */}
        {govtView === 'bottlenecks' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900">AI Bottleneck Predictions & Alerts</h2>
                <p className="text-xs text-stone-500">Real-time AI analysis of procurement stage congestion across all centres</p>
              </div>
              <button
                onClick={() => { setPredictionsLoaded(false); loadPredictions(); }}
                disabled={isLoadingPredictions}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-2xl cursor-pointer transition-all disabled:opacity-60"
              >
                {isLoadingPredictions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isLoadingPredictions ? 'Analysing...' : 'Refresh AI Predictions'}
              </button>
            </div>

            {/* AI Prediction Engine Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-3xl p-5 border border-blue-900/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">AI Bottleneck Intelligence Engine</h3>
                  <p className="text-[11px] text-blue-300">Analyses queue depth, stage counts & historical delays · Powered by Gemini 2.5 Flash</p>
                </div>
                {predictionTimestamp && (
                  <span className="ml-auto text-[10px] text-slate-400">Last updated: {predictionTimestamp}</span>
                )}
              </div>

              {isLoadingPredictions && (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  <div>
                    <p className="text-sm text-blue-200 font-bold">AI is analysing all procurement stages...</p>
                    <p className="text-[11px] text-blue-400">Processing queue data for {registrations.length} registrations across {centres.length} centres</p>
                  </div>
                </div>
              )}

              {!isLoadingPredictions && !predictionsLoaded && (
                <p className="text-xs text-slate-400 italic py-2">Click "Refresh AI Predictions" to analyse current bottlenecks.</p>
              )}
            </div>

            {/* Prediction Cards */}
            {predictions.length > 0 && !isLoadingPredictions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((pred, i) => {
                  const styles = SEVERITY_STYLES[pred.severity];
                  return (
                    <div key={i} className={`bg-white rounded-3xl p-5 border ${styles.border} shadow-sm space-y-3`}>
                      {/* Stage Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{styles.icon}</span>
                          <div>
                            <p className="font-black text-sm text-stone-900">{pred.stage.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-stone-400">Est. delay: {pred.estimatedDelayMins} min</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${styles.badge}`}>
                          {pred.severity}
                        </span>
                      </div>

                      {/* Prediction */}
                      <div className={`rounded-2xl p-3.5 ${styles.bg}`}>
                        <div className="flex items-start gap-2">
                          <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-600" />
                          <p className="text-xs text-stone-700 leading-relaxed">{pred.prediction}</p>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                        <div className="flex items-start gap-2">
                          <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                          <div>
                            <p className="text-[10px] font-bold text-blue-800 uppercase mb-0.5">Recommended Action</p>
                            <p className="text-xs text-stone-700 leading-relaxed">{pred.recommendation}</p>
                          </div>
                        </div>
                      </div>

                      {/* Delay bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-stone-500 mb-1">
                          <span>Estimated delay</span><span className="font-bold">{pred.estimatedDelayMins} min</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${pred.severity === 'CRITICAL' ? 'bg-red-500' : pred.severity === 'HIGH' ? 'bg-orange-500' : pred.severity === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, (pred.estimatedDelayMins / 120) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <p className={`text-[9px] font-bold ${pred.source === 'gemini' ? 'text-blue-600' : 'text-amber-600'}`}>
                        {pred.source === 'gemini' ? '⚡ Gemini AI Analysis' : '🔷 Rule-Based Analysis'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary statistics */}
            {predictions.length > 0 && !isLoadingPredictions && (
              <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm">
                <h3 className="font-bold text-sm text-stone-900 mb-3">Live Stage Distribution</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { stage: 'GATE_ENTRY', label: 'Gate Entry', color: 'bg-stone-500' },
                    { stage: 'QUALITY_CHECK', label: 'Quality Check', color: 'bg-blue-500' },
                    { stage: 'WEIGHING', label: 'Weighing', color: 'bg-amber-500' },
                    { stage: 'BAGGING', label: 'Bagging', color: 'bg-orange-500' },
                  ].map(s => {
                    const count = registrations.filter(r => r.current_stage === s.stage).length;
                    return (
                      <div key={s.stage} className="bg-stone-50 rounded-2xl p-3 border border-stone-200">
                        <div className={`w-2 h-2 rounded-full ${s.color} mb-1.5`} />
                        <span className="text-stone-500 block text-[10px] uppercase">{s.label}</span>
                        <span className="text-2xl font-black text-stone-900">{count}</span>
                        <span className="text-[10px] text-stone-400 block">farmers</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            4. PAYMENTS MONITORING
        ═══════════════════════════════════════════════════════ */}
        {govtView === 'payments' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">Direct Benefit Transfer (DBT) Oversight</h2>
              <p className="text-xs text-stone-500">State-wide PFMS disbursement logs</p>
            </div>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-900 text-sm">{p.transaction_id}</span>
                      <p className="text-stone-500">Amount: ₹{p.amount.toLocaleString()} · {p.quantity} Quintals</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full">{p.status}</span>
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

        {/* Reports & Analytics */}
        {govtView === 'reports_analytics' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
              <h2 className="text-xl font-black text-stone-900">Reports & Analytics</h2>
              <p className="text-xs text-stone-500">Procurement performance metrics</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Completion Rate', value: totalRegistrations > 0 ? `${Math.round((totalCompleted / totalRegistrations) * 100)}%` : '0%', sub: `${totalCompleted} of ${totalRegistrations} processed`, color: 'text-emerald-800' },
                { label: 'Total MSP Value', value: `₹${totalDisbursedMSP.toLocaleString()}`, sub: `${totalQuantityQuintals} quintals procured`, color: 'text-blue-800' },
                { label: 'Active Farmers', value: totalWaiting + totalProcessing, sub: 'In queue or processing', color: 'text-amber-800' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm text-center space-y-1">
                  <p className="text-xs text-stone-500 uppercase font-bold">{stat.label}</p>
                  <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-[11px] text-stone-400">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MANDI OPERATORS
        ═══════════════════════════════════════════════════════ */}
        {govtView === 'operators' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-stone-900">Mandi Operators</h2>
                <p className="text-xs text-stone-500">Approved operators managing procurement centres</p>
              </div>
              <button
                onClick={fetchOperators}
                className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOperators ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingOperators ? (
              <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-stone-500 text-sm font-bold">Loading approved operators...</p>
              </div>
            ) : operatorsList.filter(op => op.designation === 'APPROVED').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operatorsList.filter(op => op.designation === 'APPROVED').map(op => {
                  const c = centres.find(cen => cen.id === op.centre_id);
                  return (
                    <div key={op.id} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-stone-900 text-lg">{op.name}</h3>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">APPROVED OPERATOR</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                          {op.name.charAt(0)}
                        </div>
                      </div>
                      <div className="text-xs text-stone-500 mt-4 space-y-2">
                        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-stone-400" /> {op.phone}</p>
                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-stone-400" /> {op.email}</p>
                        <p className="flex items-center gap-2"><Building className="w-4 h-4 text-stone-400" /> {c ? `${c.name} (${c.district})` : 'Unknown Centre'}</p>
                        <p className="flex items-center gap-2"><User className="w-4 h-4 text-stone-400" /> ID: {op.employee_id || 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="font-bold text-stone-900">No approved operators found.</p>
                <p className="text-xs text-stone-500 mt-1">Approve pending operators from the Operator Approvals tab.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            OPERATOR APPROVALS
        ═══════════════════════════════════════════════════════ */}
        {govtView === 'operator_approvals' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-stone-900">Mandi Operator Approvals</h2>
                <p className="text-xs text-stone-500">Review and authorize new operator registrations</p>
              </div>
              <button
                onClick={fetchOperators}
                className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOperators ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingOperators ? (
              <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-stone-500 text-sm font-bold">Loading pending operators...</p>
              </div>
            ) : operatorsList.filter(op => op.designation !== 'APPROVED').length > 0 ? (
              <div className="space-y-4">
                {operatorsList.filter(op => op.designation !== 'APPROVED').map(op => {
                  const c = centres.find(cen => cen.id === op.centre_id);
                  return (
                    <div key={op.id} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                          {op.name}
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">PENDING APPROVAL</span>
                        </h3>
                        <div className="text-xs text-stone-500 mt-1 space-y-0.5">
                          <p>📱 {op.phone} &nbsp; ✉️ {op.email}</p>
                          <p>📍 {c ? `${c.name} (${c.district})` : 'Unknown Centre'} • ID: {op.employee_id || 'N/A'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApproveOperator(op.id)}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Approve Operator
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <CheckCircle2 className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="font-bold text-stone-900">No pending operators found.</p>
                <p className="text-xs text-stone-500 mt-1">Operator registrations will appear here for approval.</p>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        {govtView === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-stone-900">Government Officer Profile</h2>
            <div className="space-y-3 text-xs">
              {[
                { label: 'Officer Name', value: authSession.user?.name },
                { label: 'Designation / Department', value: authSession.user?.designation },
                { label: 'Assigned District', value: authSession.user?.district },
                { label: 'Access Level', value: 'State Oversight Officer', color: 'text-blue-700' },
              ].map((row, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-stone-500">{row.label}:</span>
                  <span className={`font-bold text-stone-900 uppercase ${row.color || ''}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
