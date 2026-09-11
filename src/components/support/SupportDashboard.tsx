import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import {
  Headphones,
  PhoneCall,
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Calendar,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

export const SupportDashboard: React.FC = () => {
  const {
    currentFarmer,
    activeBooking,
    procurementRecord,
    paymentRecord,
    supportTickets,
    incomingCall,
    isAgentConnected,
    acceptCallBySupportAgent,
    endCallSession,
    dispatchNotification,
    bookNewSlot,
  } = useKisanFlow();

  const [lookupPhone, setLookupPhone] = useState<string>('9848012345');
  const [ticketActionMsg, setTicketActionMsg] = useState<string>('');
  const [grievanceText, setGrievanceText] = useState<string>('');
  const [selectedIssueType, setSelectedIssueType] = useState<string>('Queue & Slot Inquiry');

  const handleAction = (msg: string) => {
    setTicketActionMsg(msg);
    dispatchNotification({
      farmer_id: currentFarmer.id,
      type: 'QUEUE_UPDATE',
      title: 'Support Desk Update',
      message: msg,
      channel: 'SMS',
    });
    setTimeout(() => setTicketActionMsg(''), 4000);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    handleAction(`Grievance ticket #TK-2026-881 registered for ${selectedIssueType}. SMS update sent to farmer.`);
    setGrievanceText('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Support Desk Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xl border border-purple-300">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                Assisted Support & Call Centre Desk (1800-425-4747)
              </h1>
              <span className="bg-purple-100 text-purple-900 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
                Agent ID: AGT-504 (K. Swathi)
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Assisting low-literacy and keypad-phone farmers with procurement bookings and queue queries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Agent Status: READY / ACTIVE
          </span>
        </div>
      </div>

      {/* Incoming Call Alert Card (Triggered by Phone IVR Press 7) (Section 18) */}
      {incomingCall && (
        <div className="bg-linear-to-r from-purple-700 to-indigo-900 text-white rounded-3xl p-5 shadow-lg border border-purple-400/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-amber-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-stone-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  INCOMING CALL ESCALATED FROM 1800 HELPLINE
                </span>
                <span className="text-xs text-purple-200">Phone: {incomingCall.phone}</span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                {incomingCall.farmer_name} • Token #{incomingCall.token_number}
              </h2>
              <p className="text-xs text-purple-200">
                Centre: {incomingCall.centre_name} • Queue ahead: {incomingCall.queue_ahead} •
                Payment: {incomingCall.payment_status}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isAgentConnected ? (
              <button
                onClick={acceptCallBySupportAgent}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
              >
                ✓ Accept Call (కాల్ స్వీకరించండి)
              </button>
            ) : (
              <button
                onClick={endCallSession}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-transform active:scale-95"
              >
                ✕ Resolve & Log Call
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Farmer Lookup & Assisted Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Caller Profile & Booking Context */}
        <div className="lg:col-span-6 space-y-5">
          {/* Quick Farmer Search */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-700" />
              Farmer Record Lookup (Aadhaar / Mobile)
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Enter 10-digit mobile or Aadhaar"
                className="flex-1 p-2.5 rounded-xl border border-stone-300 text-xs font-bold"
              />
              <button
                onClick={() => handleAction('Fetched official farmer credentials for Ravi Kumar')}
                className="px-4 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>

          {/* Farmer Full Context Card */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">{currentFarmer.name}</h3>
                <p className="text-xs text-stone-500">{currentFarmer.village}, {currentFarmer.district}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                eKYC Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Aadhaar (Masked)</span>
                <span className="font-mono font-bold text-stone-900">{currentFarmer.aadhaar_masked}</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Land Holding</span>
                <span className="font-bold text-stone-900">{currentFarmer.land_holding_acres} Acres (Pattadar)</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Active Token</span>
                <span className="font-mono font-black text-amber-700 text-base">#{activeBooking?.token_number || 47}</span>
              </div>
              <div className="bg-stone-50 p-2.5 rounded-xl">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Queue Ahead</span>
                <span className="font-bold text-stone-900">{activeBooking?.farmers_ahead || 4} farmers ahead</span>
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-purple-900 font-medium">Procurement Centre:</span>
                <span className="font-bold text-stone-900">Lakshmipur Procurement Centre</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-900 font-medium">Slot Time:</span>
                <span className="font-bold text-stone-900">14 Sep 2026 • 10:00 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-900 font-medium">Produce:</span>
                <span className="font-bold text-stone-900">Paddy • 25 Quintals</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Operator Assisted Action Triggers (Section 19) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
              Assisted Actions (Execute On Behalf of Farmer)
            </h2>

            {ticketActionMsg && (
              <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{ticketActionMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={() => handleAction('Current queue position #47 (4 ahead, ~20 mins) read out & SMS resent')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-purple-50 hover:border-purple-300 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <Clock className="w-4 h-4 text-purple-700 mb-1" />
                <p className="font-bold text-stone-900">Resend Queue SMS</p>
                <p className="text-[11px] text-stone-500">Alerts farmer with current position</p>
              </button>

              <button
                onClick={() => {
                  bookNewSlot('centre_ramapuram', 'slot_3', 'Paddy', 25, '14 September 2026', '12:00 PM');
                  handleAction('Slot rescheduled to 12:00 PM at Ramapuram Centre (Save ~27 min)');
                }}
                className="p-3 rounded-xl bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-emerald-700 mb-1" />
                <p className="font-bold text-stone-900">Reschedule to Ramapuram</p>
                <p className="text-[11px] text-stone-500">Diverts away from crowded centre</p>
              </button>

              <button
                onClick={() => handleAction('DBT Payment status verified: ₹48,750 initiated via PFMS reference KF-PAY-2026-00981')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-blue-50 hover:border-blue-300 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-blue-700 mb-1" />
                <p className="font-bold text-stone-900">Verify Payment DBT</p>
                <p className="text-[11px] text-stone-500">Explains Aadhaar-bank status</p>
              </button>

              <button
                onClick={() => handleAction('Physical weighbridge verification request sent to Mandi Inspector')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-amber-50 hover:border-amber-300 border border-stone-200 text-left transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-700 mb-1" />
                <p className="font-bold text-stone-900">Request Re-weighing</p>
                <p className="text-[11px] text-stone-500">Escalate moisture grievance</p>
              </button>
            </div>

            {/* Raise Grievance Ticket Form */}
            <form onSubmit={handleCreateTicket} className="pt-3 border-t border-stone-100 text-xs space-y-3">
              <h3 className="font-bold text-stone-800 uppercase text-[11px]">
                Raise Formal Procurement Grievance
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedIssueType}
                  onChange={(e) => setSelectedIssueType(e.target.value)}
                  className="p-2 rounded-xl border border-stone-300 bg-white font-medium"
                >
                  <option>Queue & Slot Inquiry</option>
                  <option>Moisture / Quality Deduction Dispute</option>
                  <option>Payment Delay / Bank Mismatch</option>
                  <option>Mandi Gunny Bag Shortage</option>
                </select>

                <input
                  type="text"
                  value={grievanceText}
                  onChange={(e) => setGrievanceText(e.target.value)}
                  placeholder="Additional operator remarks..."
                  className="p-2 rounded-xl border border-stone-300"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Submit Ticket & SMS Reference to Farmer
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
