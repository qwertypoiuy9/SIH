import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
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
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { GovernmentSidebarView } from '../../types';

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
  } = useKisanFlow();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Real database metrics across all centres
  const totalRegistrations = registrations.length;
  const totalCompleted = registrations.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length;
  const totalWaiting = registrations.filter(r => r.current_stage === 'GATE_ENTRY').length;
  const totalProcessing = registrations.filter(
    r => r.current_stage !== 'GATE_ENTRY' && r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ).length;

  const totalQuantityQuintals = registrations
    .filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED')
    .reduce((acc, r) => acc + (r.quantity_quintals || 0), 0);

  const totalDisbursedMSP = totalQuantityQuintals * 1950;

  // Bottleneck detection
  const delayedRegistrations = registrations.filter(r => (r.delay_minutes || 0) > 30);

  const navItems: { id: GovernmentSidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '🏠 Overview', icon: <Landmark className="w-4 h-4" /> },
    { id: 'farmers', label: '👨‍🌾 Farmers', icon: <Users className="w-4 h-4" /> },
    { id: 'operators', label: '👷 Mandi Operators', icon: <Building className="w-4 h-4" /> },
    { id: 'live_queue', label: '🚜 Live Queue', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'all_registrations', label: '📋 All Registrations', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'procurement_monitoring', label: '⚙️ Procurement Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'payments', label: '💰 Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'reports_analytics', label: '📊 Reports & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'bottlenecks', label: '🚨 Bottlenecks & Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'notifications', label: '🔔 Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'voice_assistant', label: '🎙️ Voice Assistant', icon: <Mic className="w-4 h-4" /> },
    { id: 'profile', label: '👤 Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900 font-sans">
      {/* MOBILE TOGGLE */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2.5 bg-blue-900 text-white rounded-xl shadow-md cursor-pointer"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* GOVERNMENT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-5 h-5 text-blue-400" />
            <span className="font-black text-lg tracking-tight text-white">KisanFlow</span>
            <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded-full font-bold uppercase">
              Govt
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">State Command Portal</p>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = govtView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice_assistant') {
                    setIsVoiceAssistantOpen(true);
                  } else {
                    setGovtView(item.id);
                  }
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-xs font-bold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-300" />}
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

          <button
            onClick={logoutUser}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-900 cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN OFFICER CONTENT */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 min-h-screen space-y-6">
        {/* ======================================================== */}
        {/* 1. STATE & DISTRICT OVERVIEW */}
        {/* ======================================================== */}
        {govtView === 'overview' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">
                  State Procurement Operations Command
                </h1>
                <p className="text-xs text-stone-500">
                  Live supervision of farmers, mandi centres & direct benefit transfers
                </p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-900 font-bold px-3 py-1.5 rounded-full border border-blue-200">
                Official Government Oversight
              </span>
            </div>

            {/* Real Database KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Registered Farmers</span>
                <span className="text-3xl font-black text-stone-900 mt-1 block">{totalRegistrations}</span>
                <span className="text-[10px] text-stone-400">Total in Database</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Active in Yard</span>
                <span className="text-3xl font-black text-blue-700 mt-1 block">{totalProcessing}</span>
                <span className="text-[10px] text-blue-600">Across 3 centres</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Waiting at Gate</span>
                <span className="text-3xl font-black text-amber-700 mt-1 block">{totalWaiting}</span>
                <span className="text-[10px] text-amber-600">Pending verification</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Completed Today</span>
                <span className="text-3xl font-black text-emerald-800 mt-1 block">{totalCompleted}</span>
                <span className="text-[10px] text-emerald-600">J-Forms issued</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Procured Quantity</span>
                <span className="text-3xl font-black text-stone-900 mt-1 block">{totalQuantityQuintals} Qtl</span>
                <span className="text-[10px] text-stone-500">Weighbridge recorded</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Disbursed MSP</span>
                <span className="text-3xl font-black text-emerald-800 mt-1 block">₹{totalDisbursedMSP}</span>
                <span className="text-[10px] text-emerald-600">Direct Benefit Transfer</span>
              </div>
            </div>

            {/* Centre Monitoring Cards */}
            <div className="space-y-3">
              <h3 className="font-black text-base text-stone-900">Procurement Centres Under Jurisdiction</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {centres.map((c) => {
                  const centreCount = registrations.filter(r => r.centre_id === c.id).length;
                  const waiting = registrations.filter(
                    r => r.centre_id === c.id && r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
                  ).length;
                  return (
                    <div key={c.id} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-stone-900">{c.name}</h4>
                          <p className="text-xs text-stone-500">{c.district}, {c.state}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {c.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-2xl text-xs">
                        <div>
                          <span className="text-stone-400 block text-[10px] uppercase">Total Bookings</span>
                          <span className="font-bold text-stone-900 text-base">{centreCount}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px] uppercase">Waiting in Queue</span>
                          <span className="font-bold text-amber-700 text-base">{waiting}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-stone-500 flex justify-between">
                        <span>Active Counters: {c.counters_active}</span>
                        <span>Capacity: {c.capacity_per_day}/day</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. ALL REGISTRATIONS (AUDIT & COMPLIANCE) */}
        {/* ======================================================== */}
        {(govtView === 'all_registrations' || govtView === 'farmers' || govtView === 'live_queue') && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-stone-900">All State Procurement Registrations</h2>
                <p className="text-xs text-stone-500">Live multi-centre database records from Supabase</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-900 font-bold px-3 py-1 rounded-full">
                {registrations.length} Total Registrations
              </span>
            </div>

            {registrations.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
                    <tr>
                      <th className="p-4">Token</th>
                      <th className="p-4">Farmer</th>
                      <th className="p-4">Centre</th>
                      <th className="p-4">Crop</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Current Stage</th>
                      <th className="p-4">Status</th>
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
                        <td className="p-4 font-bold text-amber-800">{r.current_stage.replace('_', ' ')}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">
                            {r.procurement_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No registrations found.</p>
                <p className="text-xs text-stone-500 mt-1">Initial database is clean. No registrations have been created yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. BOTTLENECKS & ALERTS */}
        {/* ======================================================== */}
        {govtView === 'bottlenecks' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">Mandi Bottlenecks & Real-World Delay Alerts</h2>
              <p className="text-xs text-stone-500">
                Ground-reality tracking: Assayer shortages, weighbridge congestion & bardana delays
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-amber-300 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Stage 4: Bagging & Gunny Bags (Bardana)</span>
                </div>
                <p className="text-xs text-stone-600">
                  Ground Reality: 1–2 days delay due to state bardana distribution bottleneck and labour shortage.
                </p>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                  Recommended Action: Dispatch buffer jute bales
                </span>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-blue-300 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                  <Clock className="w-5 h-5" />
                  <span>Stage 3: Weighing & Unloading</span>
                </div>
                <p className="text-xs text-stone-600">
                  Ground Reality: 4–6 hours delay when single digital weighbridge experiences queue spikes.
                </p>
                <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                  Recommended Action: Activate auxiliary weigh platform
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. PAYMENTS MONITORING */}
        {/* ======================================================== */}
        {govtView === 'payments' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">Direct Benefit Transfer (DBT) Oversight</h2>
              <p className="text-xs text-stone-500">State-wide PFMS disbursement logs</p>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-900 text-sm">{p.transaction_id}</span>
                      <p className="text-stone-500">Amount: ₹{p.amount} • {p.quantity} Quintals</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                      {p.status}
                    </span>
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
        {govtView === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-stone-900">Government Officer Profile</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Officer Name:</span>
                <span className="font-bold text-stone-900">{authSession.user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Designation / Department:</span>
                <span className="font-bold text-stone-900">{authSession.user?.designation}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Assigned District:</span>
                <span className="font-bold text-stone-900">{authSession.user?.district}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-stone-500">Access Level:</span>
                <span className="font-bold text-blue-700 uppercase">State Oversight Officer</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
