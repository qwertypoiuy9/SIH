import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
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
} from 'lucide-react';
import {
  OperatorSidebarView,
  ProcurementStage,
  ProcurementStatus,
  Registration,
} from '../../types';

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
  } = useKisanFlow();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const operatorCentreId = authSession.user?.centre_id || 'centre_lakshmipur';
  const centre = centres.find(c => c.id === operatorCentreId) || centres[0];

  // Operator-centre registrations
  const centreRegs = registrations.filter(r => r.centre_id === operatorCentreId);

  // Active queue: registrations not completed or rejected
  const waitingQueue = centreRegs.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  );

  // Currently called / active farmer
  const activeFarmer = waitingQueue.find(
    r => r.procurement_status !== 'WAITING_FOR_GATE_ENTRY'
  ) || waitingQueue[0];

  // Selected registration for stage update modal / panel
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

  // Dynamic Metrics directly calculated from database
  const todayRegistrations = centreRegs.length;
  const waitingCount = waitingQueue.filter(r => r.current_stage === 'GATE_ENTRY').length;
  const inProcessingCount = waitingQueue.filter(r => r.current_stage !== 'GATE_ENTRY').length;
  const completedCount = centreRegs.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length;
  const currentToken = activeFarmer?.token_number || 0;
  const nextToken = waitingQueue.length > 1 ? waitingQueue[1].token_number : 0;

  // Handle stage transition
  const handleUpdateStatus = async (stage: ProcurementStage, status: ProcurementStatus) => {
    if (!activeSelectedReg) return;
    setIsUpdating(true);
    try {
      await updateRegistrationStage(activeSelectedReg.id, stage, status, {
        delayMinutes: bottleneckDelay,
        bottleneckRemarks: bottleneckRemarks,
        qualityCheck: {
          moisture_percentage: moisture,
          quality_result: qualityGrade,
          remarks: 'Moisture tested & approved by Mandi Operator',
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
    } catch (err) {
      alert('Error updating status: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Fast-advance to next token
  const handleCallNextFarmer = async () => {
    const nextInLine = waitingQueue.find(r => r.procurement_status === 'WAITING_FOR_GATE_ENTRY');
    if (!nextInLine) {
      alert('No waiting farmers in gate queue.');
      return;
    }
    await updateRegistrationStage(nextInLine.id, 'GATE_ENTRY', 'GATE_ENTRY_VERIFIED', {
      bottleneckRemarks: 'Farmer called into Mandi Yard Counter #2',
    });
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

      {/* OPERATOR SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-stone-950 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-stone-800">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-amber-500" />
            <span className="font-black text-lg tracking-tight text-white">KisanFlow</span>
            <span className="text-[10px] bg-amber-900 text-amber-200 px-2 py-0.5 rounded-full font-bold uppercase">
              Operator
            </span>
          </div>
          <p className="text-xs text-stone-400 truncate">{centre.name}</p>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = operatorView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice_assistant') {
                    setIsVoiceAssistantOpen(true);
                  } else {
                    setOperatorView(item.id);
                  }
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-700 text-white shadow-xs font-bold'
                    : 'text-stone-300 hover:bg-stone-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-300" />}
              </button>
            );
          })}
        </div>

        {/* User profile & Logout */}
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

          <button
            onClick={logoutUser}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950 hover:bg-red-900 text-red-200 text-xs font-bold border border-red-900 cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* OPERATOR MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 min-h-screen space-y-6">
        {/* ======================================================== */}
        {/* 1. OPERATOR DASHBOARD OVERVIEW */}
        {/* ======================================================== */}
        {operatorView === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Top Centre Status Bar */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xl border border-amber-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900">{centre.name}</h1>
                  <p className="text-xs text-stone-500">
                    District: {centre.district} • Active Counters: {centre.counters_active} • Capacity: {centre.capacity_per_day}/day
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCallNextFarmer}
                  className="px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md cursor-pointer flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <RotateCw className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>CALL NEXT FARMER (తదుపరి రైతు)</span>
                </button>
              </div>
            </div>

            {/* Live Database Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Registered Today</span>
                <span className="text-3xl font-black text-stone-900 mt-1 block">{todayRegistrations}</span>
                <span className="text-[10px] text-stone-400">Total in Supabase</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Waiting at Gate</span>
                <span className="text-3xl font-black text-amber-700 mt-1 block">{waitingCount}</span>
                <span className="text-[10px] text-amber-600">Pending Gate Entry</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Being Processed</span>
                <span className="text-3xl font-black text-blue-700 mt-1 block">{inProcessingCount}</span>
                <span className="text-[10px] text-blue-600">Active in yard</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Completed</span>
                <span className="text-3xl font-black text-emerald-700 mt-1 block">{completedCount}</span>
                <span className="text-[10px] text-emerald-600">J-Forms Issued</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Current Token</span>
                <span className="text-3xl font-black text-emerald-800 font-mono mt-1 block">
                  {currentToken > 0 ? `#${currentToken}` : 'None'}
                </span>
                <span className="text-[10px] text-stone-500">At active stage</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
                <span className="text-stone-500 font-semibold block text-[10px] uppercase">Next Token</span>
                <span className="text-3xl font-black text-stone-700 font-mono mt-1 block">
                  {nextToken > 0 ? `#${nextToken}` : 'None'}
                </span>
                <span className="text-[10px] text-stone-400">Next in line</span>
              </div>
            </div>

            {/* Main Operational Workflow Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Live Queue Table */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-bold text-sm text-stone-900">Mandi Queue & Stage Control</h3>
                  <span className="text-xs text-stone-500">{waitingQueue.length} farmers in yard</span>
                </div>

                {waitingQueue.length > 0 ? (
                  <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                    {waitingQueue.map((r) => {
                      const isSelected = activeSelectedReg?.id === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setSelectedRegId(r.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer my-1 flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                              : 'bg-white border-stone-100 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-lg text-emerald-800">
                              #{r.token_number}
                            </span>
                            <div>
                              <p className="font-bold text-xs text-stone-900">{r.farmer_name}</p>
                              <p className="text-[11px] text-stone-500">
                                {r.crop} • {r.quantity_quintals} Qtl • {r.vehicle_number}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-bold text-amber-800 block text-[11px]">
                              {r.current_stage.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {r.procurement_status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-stone-400">
                    No farmers currently in the waiting queue.
                  </div>
                )}
              </div>

              {/* Right Column: 5-Stage Operator Control Panel */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                {activeSelectedReg ? (
                  <>
                    <div className="border-b border-stone-100 pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">OPERATOR CONTROLLER</span>
                        <h3 className="font-black text-base text-stone-900">
                          Token #{activeSelectedReg.token_number} — {activeSelectedReg.farmer_name}
                        </h3>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                        {activeSelectedReg.crop} ({activeSelectedReg.quantity_quintals} Q)
                      </span>
                    </div>

                    {/* Stage 1: Gate Entry */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-stone-800">Stage 1: Gate Entry</span>
                        <span className="text-[10px] font-mono text-stone-500">Ideal: 5m | Bottleneck: 1-3h</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus('GATE_ENTRY', 'GATE_ENTRY_VERIFIED')}
                          className="flex-1 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Verify Gate Entry ✓
                        </button>
                      </div>
                    </div>

                    {/* Stage 2: Quality & Moisture */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 2: Quality & Moisture</span>
                        <span className="text-[10px] font-mono text-stone-500">Moisture &lt; 17%</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 block">Moisture (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={moisture}
                            onChange={(e) => setMoisture(Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg border border-stone-300 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block">FAQ Grade</label>
                          <select
                            value={qualityGrade}
                            onChange={(e) => setQualityGrade(e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-stone-300 text-xs"
                          >
                            <option value="Grade A (Premium)">Grade A (Premium)</option>
                            <option value="FAQ (Fair Average Quality)">FAQ Standard</option>
                            <option value="Grade B">Grade B</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus('QUALITY_CHECK', 'QUALITY_CHECK_COMPLETED')}
                          className="flex-1 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Approve Quality ✓
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('QUALITY_CHECK', 'QUALITY_REJECTED')}
                          className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Stage 3: Weighing & Unloading */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 3: Weighing & Unloading</span>
                        <span className="text-[10px] font-mono text-stone-500">Weighbridge</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-stone-500 block">Gross Weight (Qtl)</label>
                          <input
                            type="number"
                            value={grossWeight}
                            onChange={(e) => setGrossWeight(Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg border border-stone-300 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 block">Tare Weight (Qtl)</label>
                          <input
                            type="number"
                            value={tareWeight}
                            onChange={(e) => setTareWeight(Number(e.target.value))}
                            className="w-full p-1.5 rounded-lg border border-stone-300 text-xs"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpdateStatus('WEIGHING', 'WEIGHING_COMPLETED')}
                        className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer"
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
                        <input
                          type="number"
                          value={bagCount}
                          onChange={(e) => setBagCount(Number(e.target.value))}
                          placeholder="No. of bags"
                          className="flex-1 p-1.5 rounded-lg border border-stone-300 text-xs"
                        />
                        <button
                          onClick={() => handleUpdateStatus('BAGGING', 'BAGGING_COMPLETED')}
                          className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Complete Bagging ✓
                        </button>
                      </div>
                    </div>

                    {/* Stage 5: J-Form & Complete */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-stone-800">Stage 5: J-Form & Final Completion</span>
                        <span className="text-[10px] font-mono text-stone-500">Auto-triggers DBT</span>
                      </div>
                      <button
                        onClick={() => handleUpdateStatus('COMPLETED', 'PROCUREMENT_COMPLETED')}
                        className="w-full py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
                      >
                        Generate Official J-Form & Complete Procurement ✓
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-xs text-stone-400">
                    Select a farmer from the queue table to control their procurement stages.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. ALL BOOKINGS / REGISTRATIONS TABLE */}
        {/* ======================================================== */}
        {(operatorView === 'farmer_registrations' || operatorView === 'all_bookings' || operatorView === 'token_management') && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-stone-900">All Registered Farmers & Tokens</h2>
                <p className="text-xs text-stone-500">Directly queried from Supabase for {centre.name}</p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                {centreRegs.length} total registrations
              </span>
            </div>

            {centreRegs.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
                    <tr>
                      <th className="p-4">Token</th>
                      <th className="p-4">Farmer Name</th>
                      <th className="p-4">Mobile</th>
                      <th className="p-4">Crop</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Vehicle</th>
                      <th className="p-4">Stage</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {centreRegs.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50">
                        <td className="p-4 font-mono font-black text-emerald-800 text-sm">#{r.token_number}</td>
                        <td className="p-4 font-bold text-stone-900">{r.farmer_name}</td>
                        <td className="p-4 font-mono text-stone-500">{r.phone}</td>
                        <td className="p-4">{r.crop}</td>
                        <td className="p-4 font-bold">{r.quantity_quintals} Qtl</td>
                        <td className="p-4 font-mono text-stone-500">{r.vehicle_number}</td>
                        <td className="p-4 font-bold text-amber-800">{r.current_stage.replace('_', ' ')}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
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
                <p className="text-xs text-stone-500 mt-1">
                  When farmers register on the portal, their database-sequenced tokens appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. J-FORMS & RECEIPTS */}
        {/* ======================================================== */}
        {operatorView === 'j_forms' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">Electronic J-Forms & Receipts</h2>
              <p className="text-xs text-stone-500">Official sales receipts issued to farmers for DBT credit</p>
            </div>

            {centreRegs.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').length > 0 ? (
              <div className="space-y-4">
                {centreRegs.filter(r => r.procurement_status === 'PROCUREMENT_COMPLETED').map(r => (
                  <div key={r.id} className="bg-white rounded-3xl p-6 border border-emerald-300 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold">OFFICIAL J-FORM RECEIPT</span>
                        <h4 className="font-bold text-stone-900">JF-2026-00{r.token_number}</h4>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                        COMPLETED & CERTIFIED ✓
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-stone-500">Farmer:</span>
                        <p className="font-bold text-stone-900">{r.farmer_name}</p>
                      </div>
                      <div>
                        <span className="text-stone-500">Quantity Procured:</span>
                        <p className="font-bold text-stone-900">{r.quantity_quintals} Quintals</p>
                      </div>
                      <div>
                        <span className="text-stone-500">Total MSP Payable:</span>
                        <p className="text-lg font-black text-emerald-800">₹{r.quantity_quintals * 1950}</p>
                      </div>
                      <div>
                        <span className="text-stone-500">Payment Status:</span>
                        <p className="font-bold text-blue-700">PFMS Clearing Initiated</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No J-Forms issued yet.</p>
                <p className="text-xs text-stone-500 mt-1">Complete a farmer's procurement cycle to issue the J-Form.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. PAYMENTS & OTHER VIEWS */}
        {/* ======================================================== */}
        {operatorView === 'payments' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">Mandi Payment Disbursements</h2>
              <p className="text-xs text-stone-500">Real-time payment audit records</p>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-900 text-sm">{p.transaction_id}</span>
                      <p className="text-stone-500">{p.quantity} Quintals • Amount: ₹{p.amount}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-900 font-bold rounded-full">
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

        {/* Profile / Settings */}
        {operatorView === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-lg font-black text-stone-900">Operator Profile</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Name:</span>
                <span className="font-bold text-stone-900">{authSession.user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Employee ID:</span>
                <span className="font-mono font-bold text-stone-900">{authSession.user?.employee_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Assigned Centre:</span>
                <span className="font-bold text-stone-900">{centre.name}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-stone-500">Role:</span>
                <span className="font-bold text-amber-700 uppercase">Mandi Operator</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
