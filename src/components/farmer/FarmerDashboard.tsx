import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import { translations } from '../../translations';
import {
  Home,
  Calendar,
  Ticket,
  Users,
  FileText,
  CreditCard,
  ListOrdered,
  Bell,
  Mic,
  User,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Scale,
  Menu,
  X,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { FarmerSidebarView, ProcurementStage } from '../../types';

export const FarmerDashboard: React.FC = () => {
  const {
    language,
    farmerView,
    setFarmerView,
    authSession,
    logoutUser,
    centres,
    crops,
    registrations,
    payments,
    notifications,
    bookFarmerSlot,
    setIsVoiceAssistantOpen,
    setIsPhoneModalOpen,
  } = useKisanFlow();

  const t = translations[language];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Booking Form State
  const [crop, setCrop] = useState<string>('Paddy');
  const [quantity, setQuantity] = useState<number>(25);
  const [centreId, setCentreId] = useState<string>('centre_lakshmipur');
  const [vehicleNumber, setVehicleNumber] = useState<string>('TS-03-TR-8812');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccessToken, setBookingSuccessToken] = useState<number | null>(null);

  // Farmer's personal registrations
  const farmerRegistrations = registrations.filter(
    r => r.farmer_id === authSession.user?.id || r.phone === authSession.user?.phone
  );
  // Active registration (most recent not completed)
  const activeReg = farmerRegistrations.find(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  ) || farmerRegistrations[0];

  // Active queue calculations
  const centreRegs = registrations.filter(r => r.centre_id === (activeReg?.centre_id || centreId));
  const activeQueue = centreRegs.filter(
    r => r.procurement_status !== 'PROCUREMENT_COMPLETED' && r.procurement_status !== 'QUALITY_REJECTED'
  );
  const servingReg = activeQueue.find(r => r.procurement_status !== 'WAITING_FOR_GATE_ENTRY') || activeQueue[0];
  const farmersAhead = activeReg
    ? activeQueue.filter(r => r.token_number < activeReg.token_number).length
    : 0;

  // Personal Payments
  const farmerPayments = payments.filter(
    p => p.farmer_id === authSession.user?.id
  );

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;
    setIsSubmitting(true);
    try {
      const newReg = await bookFarmerSlot({
        crop,
        quantity,
        centreId,
        vehicleNumber,
      });
      setBookingSuccessToken(newReg.token_number);
    } catch (err) {
      alert('Failed to book slot: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems: { id: FarmerSidebarView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '🏠 Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'book_slot', label: '📝 Slot Booking', icon: <Calendar className="w-4 h-4" /> },
    { id: 'my_token', label: '🎫 My Token', icon: <Ticket className="w-4 h-4" /> },
    { id: 'live_queue', label: '🚜 Live Queue', icon: <Users className="w-4 h-4" /> },
    { id: 'procurement_status', label: '📊 Procurement Status', icon: <FileText className="w-4 h-4" /> },
    { id: 'payments', label: '💰 Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'my_registrations', label: '📋 My Registrations', icon: <ListOrdered className="w-4 h-4" /> },
    { id: 'notifications', label: '🔔 Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'phone_call', label: '📞 Toll-Free Phone Call', icon: <Phone className="w-4 h-4" /> },
    { id: 'voice_assistant', label: '🎙️ Voice Assistant', icon: <Mic className="w-4 h-4" /> },
    { id: 'profile', label: '👤 Profile', icon: <User className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-stone-100 text-stone-900 font-sans">
      {/* MOBILE SIDEBAR TOGGLE */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2.5 bg-emerald-800 text-white rounded-xl shadow-md cursor-pointer"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* PERSISTENT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-emerald-950 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand */}
        <div className="p-5 border-b border-emerald-900">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🌾</span>
            <span className="font-black text-lg tracking-tight text-white">KisanFlow</span>
            <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-bold uppercase">
              Farmer
            </span>
          </div>
          <p className="text-xs text-emerald-400 font-medium">Farmer Access Portal</p>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = farmerView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'voice_assistant') {
                    setIsVoiceAssistantOpen(true);
                  } else if (item.id === 'phone_call') {
                    setIsPhoneModalOpen(true);
                  } else {
                    setFarmerView(item.id);
                  }
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs font-bold'
                    : 'text-emerald-200 hover:bg-emerald-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />}
              </button>
            );
          })}
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-emerald-900 bg-emerald-950/80">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-emerald-800 text-amber-300 font-bold flex items-center justify-center text-sm border border-emerald-700">
              {authSession.user?.name.charAt(0) || 'F'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{authSession.user?.name}</p>
              <p className="text-[10px] text-emerald-300 truncate">
                {authSession.user?.village}, {authSession.user?.district}
              </p>
            </div>
          </div>

          <button
            onClick={logoutUser}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-900/40 hover:bg-red-900/70 text-red-200 text-xs font-bold border border-red-800/50 cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout (నిష్క్రమించు)</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-8 min-h-screen">
        {/* ======================================================== */}
        {/* 1. HOME DASHBOARD */}
        {/* ======================================================== */}
        {farmerView === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-stone-900">
                  Welcome, {authSession.user?.name}
                </h1>
                <p className="text-xs text-stone-500">
                  Village: {authSession.user?.village} • District: {authSession.user?.district} • Phone: {authSession.user?.phone}
                </p>
              </div>

              <button
                onClick={() => setIsVoiceAssistantOpen(true)}
                className="px-5 py-3 rounded-2xl bg-linear-to-r from-emerald-700 to-emerald-900 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Mic className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Talk to KisanFlow Voice Assistant</span>
              </button>
            </div>

            {/* Active Booking Hero Card (if exists) */}
            {activeReg ? (
              <div className="bg-linear-to-br from-emerald-900 via-emerald-950 to-stone-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Active Procurement Booking
                  </span>
                  <span className="text-xs font-black px-3 py-0.5 rounded-full bg-amber-400 text-stone-950">
                    {activeReg.procurement_status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs text-emerald-300 uppercase font-semibold">Assigned Token</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-6xl font-black text-amber-400 font-mono tracking-tight">
                        #{activeReg.token_number}
                      </span>
                      <span className="text-xs text-emerald-200 font-bold">
                        ({activeReg.crop} • {activeReg.quantity_quintals} Qtl)
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white mt-2">{activeReg.centre_name}</p>
                    <p className="text-xs text-emerald-300">
                      Date: {activeReg.preferred_date} • Time: {activeReg.preferred_time}
                    </p>
                  </div>

                  {/* Queue Status Box */}
                  <div className="bg-emerald-800/60 backdrop-blur-md rounded-2xl p-4 border border-white/15">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        Live Mandi Queue Position
                      </span>
                      <button
                        onClick={() => setFarmerView('live_queue')}
                        className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
                      >
                        Queue Roster →
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-3xl font-black text-white">
                        {farmersAhead} {farmersAhead === 1 ? 'farmer' : 'farmers'} ahead
                      </p>
                      <p className="text-xs text-emerald-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>Est. Processing Wait: ~{farmersAhead * 35 + 20} min</span>
                      </p>
                    </div>

                    <div className="w-full bg-emerald-950/80 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="bg-amber-400 h-2 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(10, Math.min(100, 100 - farmersAhead * 15))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-3">
                  <button
                    onClick={() => setFarmerView('procurement_status')}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    View 5-Stage Status Tracker →
                  </button>
                  <button
                    onClick={() => setFarmerView('my_token')}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    View Official Digital Token Slip
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state: No active registrations */
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-800 rounded-full mx-auto flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-emerald-700" />
                </div>
                <h2 className="text-lg font-bold text-stone-900">No registrations found</h2>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  You haven't booked any procurement slots yet. Book your crop delivery slot to receive a database-generated token starting from #1.
                </p>
                <button
                  onClick={() => setFarmerView('book_slot')}
                  className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all inline-flex items-center gap-2"
                >
                  <span>Book a Procurement Slot Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setFarmerView('book_slot')}
                className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-emerald-500 transition-all text-left shadow-2xs cursor-pointer"
              >
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">Book Procurement Slot</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Select Paddy, Wheat, Maize and pick nearest PPC
                </p>
              </button>

              <button
                onClick={() => setFarmerView('live_queue')}
                className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-amber-500 transition-all text-left shadow-2xs cursor-pointer"
              >
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">Live Mandi Queue</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Track current token being served and waiting line
                </p>
              </button>

              <button
                onClick={() => setFarmerView('payments')}
                className="p-5 bg-white rounded-2xl border border-stone-200 hover:border-blue-500 transition-all text-left shadow-2xs cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-xl flex items-center justify-center mb-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">DBT Payments</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Check MSP bank credits & PFMS transaction reference
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. SLOT BOOKING */}
        {/* ======================================================== */}
        {farmerView === 'book_slot' && (
          <div className="max-w-2xl mx-auto">
            {bookingSuccessToken ? (
              <div className="bg-white rounded-3xl p-8 border border-emerald-300 shadow-md text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-700" />
                </div>
                <h2 className="text-2xl font-black text-stone-900">Slot Confirmed & Token Generated!</h2>
                <p className="text-xs text-stone-500">
                  Registration recorded in Supabase. Your database-assigned token number is:
                </p>
                <div className="text-6xl font-black font-mono text-amber-600">
                  #{bookingSuccessToken}
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl text-xs text-stone-700 border border-stone-200 text-left space-y-1">
                  <p><strong>Farmer:</strong> {authSession.user?.name}</p>
                  <p><strong>Crop & Quantity:</strong> {crop} — {quantity} Quintals</p>
                  <p><strong>Procurement Centre:</strong> {centres.find(c => c.id === centreId)?.name}</p>
                  <p><strong>Token Sequence:</strong> Begins from 1 per centre cycle</p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setBookingSuccessToken(null);
                      setFarmerView('my_token');
                    }}
                    className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    View My Token Slip →
                  </button>
                  <button
                    onClick={() => {
                      setBookingSuccessToken(null);
                      setFarmerView('dashboard');
                    }}
                    className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookSlot} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
                <div className="border-b border-stone-100 pb-3">
                  <h2 className="text-xl font-black text-stone-900">Farmer Slot Booking</h2>
                  <p className="text-xs text-stone-500">
                    Submit crop details to enter queue and receive a database-assigned sequential token
                  </p>
                </div>

                {/* Farmer Info (Pre-filled from Profile) */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs grid grid-cols-2 gap-2 text-stone-600">
                  <div>
                    <span className="block text-stone-400 uppercase text-[10px]">Farmer</span>
                    <span className="font-bold text-stone-900">{authSession.user?.name}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400 uppercase text-[10px]">Phone</span>
                    <span className="font-bold text-stone-900">{authSession.user?.phone}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400 uppercase text-[10px]">Village</span>
                    <span className="font-bold text-stone-900">{authSession.user?.village}</span>
                  </div>
                  <div>
                    <span className="block text-stone-400 uppercase text-[10px]">District</span>
                    <span className="font-bold text-stone-900">{authSession.user?.district}</span>
                  </div>
                </div>

                {/* Crop Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                    1. Select Crop (పంటను ఎంచుకోండి)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {crops.map((c) => {
                      const isSelected = crop === c.name.split(' ')[0];
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCrop(c.name.split(' ')[0])}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-800 text-white font-bold border-emerald-900 shadow-2xs'
                              : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          <span className="text-xl block mb-1">{c.icon}</span>
                          <span className="text-xs block font-bold">{c.name.split(' ')[0]}</span>
                          <span className={`text-[10px] block ${isSelected ? 'text-emerald-200' : 'text-stone-500'}`}>
                            MSP ₹{c.msp_per_quintal}/Q
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    2. Crop Quantity (Quintals / క్వింటాళ్లు)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Estimated Gross MSP Value: <strong>₹{quantity * 1950}</strong>
                  </p>
                </div>

                {/* Vehicle / Tractor Number */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    3. Vehicle / Tractor Details
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. TS-03-TR-8812"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                  />
                </div>

                {/* Procurement Centre Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    4. Procurement Centre (PPC)
                  </label>
                  <div className="space-y-2">
                    {centres.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setCentreId(c.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          centreId === c.id
                            ? 'bg-emerald-50 border-emerald-700 shadow-2xs'
                            : 'bg-white border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-xs text-stone-900">{c.name}</p>
                          <p className="text-[11px] text-stone-500">
                            {c.district}, {c.state} • {c.distance_km} km away
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-bold text-emerald-800 block">Counters: {c.counters_active}</span>
                          <span className="text-[10px] text-stone-500">Capacity: {c.capacity_per_day}/day</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-2xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Registering & Generating Token...' : 'Confirm Registration & Generate Token ✓'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. MY TOKEN */}
        {/* ======================================================== */}
        {farmerView === 'my_token' && (
          <div className="max-w-md mx-auto space-y-4">
            {activeReg ? (
              <div className="bg-white rounded-3xl border-2 border-emerald-700 p-6 shadow-lg text-center space-y-4">
                <div className="border-b border-stone-200 pb-3">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                    OFFICIAL GOVERNMENT PROCUREMENT TOKEN
                  </span>
                  <h2 className="text-xl font-black text-stone-900 mt-2">
                    {activeReg.centre_name}
                  </h2>
                </div>

                <div className="py-3">
                  <span className="text-xs text-stone-500 uppercase font-bold">TOKEN NUMBER</span>
                  <div className="text-7xl font-black font-mono text-emerald-800 my-1">
                    #{activeReg.token_number}
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full">
                    Status: {activeReg.procurement_status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="bg-stone-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-stone-200">
                  <div className="flex justify-between border-b border-stone-200 pb-1.5">
                    <span className="text-stone-500">Farmer:</span>
                    <span className="font-bold text-stone-900">{activeReg.farmer_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 pb-1.5">
                    <span className="text-stone-500">Phone:</span>
                    <span className="font-mono font-bold text-stone-900">{activeReg.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 pb-1.5">
                    <span className="text-stone-500">Crop & Qty:</span>
                    <span className="font-bold text-stone-900">{activeReg.crop} — {activeReg.quantity_quintals} Qtl</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200 pb-1.5">
                    <span className="text-stone-500">Vehicle:</span>
                    <span className="font-mono font-bold text-stone-900">{activeReg.vehicle_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Queue Ahead:</span>
                    <span className="font-bold text-amber-700">{farmersAhead} farmers</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500">
                  Please show this token at Gate Entry counter upon arrival.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                <Ticket className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="font-bold text-base text-stone-900">No active token</h3>
                <p className="text-xs text-stone-500">
                  You currently have no active token. Please book a slot first.
                </p>
                <button
                  onClick={() => setFarmerView('book_slot')}
                  className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Book a Slot →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. LIVE QUEUE */}
        {/* ======================================================== */}
        {farmerView === 'live_queue' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900">Live Mandi Queue</h2>
                <p className="text-xs text-stone-500">
                  Real-time database queue for Lakshmipur Procurement Centre
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                  Currently Serving: Token #{servingReg?.token_number || 'None'}
                </span>
              </div>
            </div>

            {activeQueue.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between text-xs font-bold text-stone-600">
                  <span>Token</span>
                  <span>Farmer</span>
                  <span>Crop</span>
                  <span>Stage</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-stone-100">
                  {activeQueue.map((reg) => {
                    const isMyToken = reg.farmer_id === authSession.user?.id;
                    return (
                      <div
                        key={reg.id}
                        className={`p-4 flex items-center justify-between text-xs transition-all ${
                          isMyToken ? 'bg-emerald-50/80 font-bold' : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-base text-emerald-800">
                            #{reg.token_number}
                          </span>
                          {isMyToken && (
                            <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-stone-900">{reg.farmer_name}</span>
                        <span className="text-stone-600">{reg.crop} ({reg.quantity_quintals} Qtl)</span>
                        <span className="text-amber-800 font-semibold">{reg.current_stage.replace('_', ' ')}</span>
                        <span className="text-[10px] bg-stone-100 px-2 py-1 rounded-full font-mono">
                          {reg.procurement_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-2">
                <p className="font-bold text-stone-900">No farmers are currently waiting.</p>
                <p className="text-xs text-stone-500">The procurement queue is currently empty.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. 5-STAGE PROCUREMENT STATUS */}
        {/* ======================================================== */}
        {farmerView === 'procurement_status' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">5-Stage Procurement Status</h2>
              <p className="text-xs text-stone-500">
                Controlled live by the Mandi Operator for Token #{activeReg?.token_number || 'N/A'}
              </p>
            </div>

            {activeReg ? (
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
                {[
                  {
                    stage: 'GATE_ENTRY',
                    title: 'Stage 1 — Gate Entry & Token Check',
                    idealTime: '5 min',
                    groundReality: '1–3 hours (Tractor checking & physical ledger)',
                    isComplete: activeReg.current_stage !== 'GATE_ENTRY',
                    isCurrent: activeReg.current_stage === 'GATE_ENTRY',
                    status: activeReg.procurement_status,
                  },
                  {
                    stage: 'QUALITY_CHECK',
                    title: 'Stage 2 — Quality & Moisture Check',
                    idealTime: '10 min',
                    groundReality: '2–4 hours (Assayer shortage & FAQ moisture tests)',
                    isComplete: ['WEIGHING', 'BAGGING', 'J_FORM', 'COMPLETED'].includes(activeReg.current_stage),
                    isCurrent: activeReg.current_stage === 'QUALITY_CHECK',
                    status: activeReg.procurement_status,
                  },
                  {
                    stage: 'WEIGHING',
                    title: 'Stage 3 — Weighing & Unloading',
                    idealTime: '15 min',
                    groundReality: '4–6 hours (Single weighbridge & labour availability)',
                    isComplete: ['BAGGING', 'J_FORM', 'COMPLETED'].includes(activeReg.current_stage),
                    isCurrent: activeReg.current_stage === 'WEIGHING',
                    status: activeReg.procurement_status,
                  },
                  {
                    stage: 'BAGGING',
                    title: 'Stage 4 — Bagging & Gunny Bags',
                    idealTime: '10 min',
                    groundReality: '1–2 days (Bardana shortage & stitching queue)',
                    isComplete: ['J_FORM', 'COMPLETED'].includes(activeReg.current_stage),
                    isCurrent: activeReg.current_stage === 'BAGGING',
                    status: activeReg.procurement_status,
                  },
                  {
                    stage: 'J_FORM',
                    title: 'Stage 5 — J-Form / Receipt & Payment',
                    idealTime: '5 min',
                    groundReality: '2–5 hours (Server connection & verification)',
                    isComplete: activeReg.current_stage === 'COMPLETED',
                    isCurrent: activeReg.current_stage === 'J_FORM' || activeReg.current_stage === 'COMPLETED',
                    status: activeReg.procurement_status,
                  },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      s.isCurrent
                        ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                        : s.isComplete
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-stone-200 bg-stone-50/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm text-stone-900">{s.title}</h4>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        s.isComplete
                          ? 'bg-emerald-700 text-white'
                          : s.isCurrent
                          ? 'bg-amber-400 text-stone-950 animate-pulse'
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        {s.isComplete ? 'COMPLETED ✓' : s.isCurrent ? 'IN PROGRESS' : 'PENDING'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 space-y-0.5 mt-2">
                      <p>⏱️ Ideal Processing: <strong>{s.idealTime}</strong></p>
                      <p>🚜 Ground Reality: <strong>{s.groundReality}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No active procurement found.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. PAYMENTS */}
        {/* ======================================================== */}
        {farmerView === 'payments' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">DBT Payments (ప్రత్యక్ష ప్రయోజన బదిలీ)</h2>
              <p className="text-xs text-stone-500">
                Official MSP payment records credited directly to your bank account
              </p>
            </div>

            {farmerPayments.length > 0 ? (
              <div className="space-y-4">
                {farmerPayments.map((p) => (
                  <div key={p.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div>
                        <span className="text-xs text-stone-500">Transaction ID</span>
                        <p className="font-mono font-bold text-stone-900">{p.transaction_id || 'PENDING'}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        p.status === 'CREDITED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-stone-500">Total Amount:</span>
                        <p className="text-xl font-black text-emerald-800">₹{p.amount}</p>
                      </div>
                      <div>
                        <span className="text-stone-500">Quantity Procured:</span>
                        <p className="font-bold text-stone-900">{p.quantity} Quintals</p>
                      </div>
                      <div>
                        <span className="text-stone-500">MSP Rate:</span>
                        <p className="font-bold text-stone-900">₹{p.msp_price} / Qtl</p>
                      </div>
                      <div>
                        <span className="text-stone-500">Bank Account:</span>
                        <p className="font-bold text-stone-900">{p.bank_account_masked || 'SBI •••• 8842'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No payment information available yet.</p>
                <p className="text-xs text-stone-500 mt-1">
                  Payment records will be generated once your produce completes weighment and J-Form is generated by the Mandi Operator.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. MY REGISTRATIONS */}
        {/* ======================================================== */}
        {farmerView === 'my_registrations' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">My Registrations & Bookings</h2>
              <p className="text-xs text-stone-500">History of all your registered slots in Supabase</p>
            </div>

            {farmerRegistrations.length > 0 ? (
              <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
                {farmerRegistrations.map((r) => (
                  <div key={r.id} className="p-5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-black text-base text-emerald-800">#{r.token_number}</span>
                      <p className="font-bold text-stone-900 text-sm mt-0.5">{r.crop} — {r.quantity_quintals} Quintals</p>
                      <p className="text-stone-500">{r.centre_name} • Date: {r.preferred_date}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-800">
                        {r.procurement_status.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[10px] text-stone-400 mt-1">Booked: {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">No registrations found.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 8. NOTIFICATIONS */}
        {/* ======================================================== */}
        {farmerView === 'notifications' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h2 className="text-xl font-black text-stone-900">Notifications & SMS Alerts</h2>
              <p className="text-xs text-stone-500">Real-time alerts sent to your mobile phone</p>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-stone-900">{n.title}</span>
                      <span className="text-[10px] text-stone-400">{new Date(n.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-stone-600">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center">
                <p className="font-bold text-stone-900">You're all caught up.</p>
                <p className="text-xs text-stone-500 mt-1">No new notifications.</p>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 9. PROFILE */}
        {/* ======================================================== */}
        {farmerView === 'profile' && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center">
                {authSession.user?.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-black text-stone-900">{authSession.user?.name}</h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  Verified Farmer
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Mobile Phone:</span>
                <span className="font-bold text-stone-900">{authSession.user?.phone}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Aadhaar (Masked):</span>
                <span className="font-mono font-bold text-stone-900">{authSession.user?.aadhaar_masked || 'XXXX-XXXX-4819'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">Village:</span>
                <span className="font-bold text-stone-900">{authSession.user?.village}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100">
                <span className="text-stone-500">District:</span>
                <span className="font-bold text-stone-900">{authSession.user?.district}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-stone-500">State:</span>
                <span className="font-bold text-stone-900">Telangana</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
