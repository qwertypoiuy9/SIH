/**
 * PPC Management Views for the Operator Dashboard
 * Contains: PPCConfigView, PPCSlotsView, PPCBookingsView, PPCAnalyticsView
 */
import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Settings, Calendar, Clock, Users, Scale, Loader2, CheckCircle2,
  AlertTriangle, Ban, RefreshCw, Eye, BarChart3, TrendingUp, Zap,
  Coffee, UserCheck, Truck, XCircle, Search, ChevronRight,
} from 'lucide-react';
import {
  PPCConfig, PPCSlot, PPCBooking, PPCHoliday, PPCBookingStatus,
  PPCAnalytics, PPCSlotOverride, Centre,
} from '../../types';
import {
  getPPCConfig, savePPCConfig, getPPCHolidays, addPPCHoliday,
  removePPCHoliday, generateSlotsForDate, getSlotsForDate,
  getBookingsForDate, getBookingsForSlot, updateBookingStatus,
  cancelPPCBooking, markNoShow, blockSlot, unblockSlot,
  getPPCAnalytics, getCapacityRecommendation, previewSlots,
  formatTime24to12, getSlotOverrides, setSlotOverride, removeSlotOverride,
  getBookingByCode,
  GeneratedSlotPreview,
} from '../../services/ppcService';

// ══════════════════════════════════════════════════════════════════════════════
// 1. PPC CONFIGURATION VIEW
// ══════════════════════════════════════════════════════════════════════════════

interface PPCConfigViewProps {
  centre: Centre;
  isPPCManager: boolean;
}

export const PPCConfigView: React.FC<PPCConfigViewProps> = ({ centre, isPPCManager }) => {
  const [config, setConfig] = useState<PPCConfig | null>(null);
  const [holidays, setHolidays] = useState<PPCHoliday[]>([]);
  const [overrides, setOverrides] = useState<PPCSlotOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<GeneratedSlotPreview[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');

  // Form state
  const [form, setForm] = useState({
    opening_time: '08:00', closing_time: '17:00',
    break_start: '13:00', break_end: '14:00',
    working_days: [1, 2, 3, 4, 5, 6],
    num_workers: 8, num_weighing_machines: 2, num_counters: 3,
    capacity_qtl_per_hour: 80, slot_duration_mins: 30,
    buffer_percentage: 20, max_qty_per_booking: 200,
    grace_period_mins: 15, is_active: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, hols, ovrs] = await Promise.all([
        getPPCConfig(centre.id),
        getPPCHolidays(centre.id),
        getSlotOverrides(centre.id),
      ]);
      if (cfg) {
        setConfig(cfg);
        setForm({
          opening_time: cfg.opening_time, closing_time: cfg.closing_time,
          break_start: cfg.break_start || '13:00', break_end: cfg.break_end || '14:00',
          working_days: cfg.working_days, num_workers: cfg.num_workers,
          num_weighing_machines: cfg.num_weighing_machines, num_counters: cfg.num_counters,
          capacity_qtl_per_hour: cfg.capacity_qtl_per_hour,
          slot_duration_mins: cfg.slot_duration_mins, buffer_percentage: cfg.buffer_percentage,
          max_qty_per_booking: cfg.max_qty_per_booking, grace_period_mins: cfg.grace_period_mins,
          is_active: cfg.is_active,
        });
      }
      setHolidays(hols); setOverrides(ovrs);
    } finally { setLoading(false); }
  }, [centre.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Preview slots when config changes
  useEffect(() => {
    const mockConfig: PPCConfig = {
      id: '', centre_id: centre.id, ...form,
      break_start: form.break_start || null, break_end: form.break_end || null,
      observed_capacity_qtl_per_hour: null, last_observed_at: null,
      created_at: '', updated_at: '',
    };
    setPreview(previewSlots(mockConfig));
  }, [form, centre.id]);

  const bookablePerSlot = Math.round(
    (form.capacity_qtl_per_hour * (1 - form.buffer_percentage / 100) * form.slot_duration_mins / 60) * 100
  ) / 100;

  const handleSave = async () => {
    if (!isPPCManager) return;
    setSaving(true);
    try {
      const saved = await savePPCConfig({
        ...form,
        centre_id: centre.id,
        id: config?.id,
        break_start: form.break_start || null,
        break_end: form.break_end || null,
      });
      setConfig(saved);
    } finally { setSaving(false); }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayReason) return;
    await addPPCHoliday(centre.id, newHolidayDate, newHolidayReason);
    setNewHolidayDate(''); setNewHolidayReason('');
    setHolidays(await getPPCHolidays(centre.id));
  };

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-stone-900">PPC Configuration</h2>
            <p className="text-xs text-stone-500">{centre.name} · {centre.district}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${form.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {form.is_active ? '🟢 ACTIVE' : '🔴 INACTIVE'}
            </span>
            {isPPCManager && (
              <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className="text-[10px] text-stone-500 hover:text-stone-700 underline cursor-pointer">Toggle</button>
            )}
          </div>
        </div>
        {!isPPCManager && (
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-semibold">
            ⚠️ View-only mode. Only PPC Managers can modify configuration.
          </div>
        )}
      </div>

      {/* Operating Schedule */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" /> Operating Schedule</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Opening Time', key: 'opening_time' },
            { label: 'Closing Time', key: 'closing_time' },
            { label: 'Break Start', key: 'break_start' },
            { label: 'Break End', key: 'break_end' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">{f.label}</label>
              <input type="time" value={(form as any)[f.key]} disabled={!isPPCManager}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-stone-50" />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-[10px] font-bold text-stone-500 uppercase mb-2">Working Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button" disabled={!isPPCManager}
                onClick={() => {
                  const wd = form.working_days.includes(i)
                    ? form.working_days.filter(x => x !== i)
                    : [...form.working_days, i].sort();
                  setForm(f => ({ ...f, working_days: wd }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${form.working_days.includes(i) ? 'bg-emerald-700 text-white' : 'bg-stone-100 text-stone-500'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Processing Capacity */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><Scale className="w-4 h-4 text-blue-600" /> Processing Capacity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Workers', key: 'num_workers', type: 'number' },
            { label: 'Weighing Machines', key: 'num_weighing_machines', type: 'number' },
            { label: 'Counters', key: 'num_counters', type: 'number' },
            { label: 'Capacity (qtl/hr)', key: 'capacity_qtl_per_hour', type: 'number' },
            { label: 'Slot Duration (min)', key: 'slot_duration_mins', type: 'number' },
            { label: 'Buffer %', key: 'buffer_percentage', type: 'number' },
            { label: 'Max Qty/Booking (qtl)', key: 'max_qty_per_booking', type: 'number' },
            { label: 'Grace Period (min)', key: 'grace_period_mins', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">{f.label}</label>
              <input type="number" value={(form as any)[f.key]} disabled={!isPPCManager}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-stone-50 font-mono" />
            </div>
          ))}
        </div>
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1">
          <p className="font-bold text-blue-900">Capacity Calculation</p>
          <p className="text-blue-800">Bookable = {form.capacity_qtl_per_hour} × (1 - {form.buffer_percentage}%) = <strong>{Math.round(form.capacity_qtl_per_hour * (1 - form.buffer_percentage / 100) * 10) / 10} qtl/hr</strong></p>
          <p className="text-blue-800">Per Slot ({form.slot_duration_mins} min) = <strong>{bookablePerSlot} qtl/slot</strong></p>
        </div>
      </div>

      {/* Slot Preview */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-600" /> Generated Slot Preview ({preview.filter(s => !s.is_break).length} slots)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {preview.map((s, i) => (
            <div key={i} className={`p-3 rounded-xl border text-center text-xs ${s.is_break ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="font-bold">{formatTime24to12(s.start_time)} – {formatTime24to12(s.end_time)}</p>
              {s.is_break ? (
                <p className="text-amber-700 font-semibold mt-1"><Coffee className="w-3 h-3 inline" /> BREAK</p>
              ) : (
                <p className="text-emerald-700 mt-1">{s.capacity_qtl} qtl capacity</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-red-600" /> Holidays & Closures</h3>
        {isPPCManager && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Date</label>
              <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Reason</label>
              <input type="text" value={newHolidayReason} onChange={e => setNewHolidayReason(e.target.value)}
                placeholder="e.g. Ganesh Chaturthi" className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm" />
            </div>
            <button onClick={handleAddHoliday} className="px-4 py-2 bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer">Add</button>
          </div>
        )}
        {holidays.length > 0 ? (
          <div className="space-y-1">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200 text-xs">
                <span><strong>{h.holiday_date}</strong> — {h.reason}</span>
                {isPPCManager && (
                  <button onClick={async () => { await removePPCHoliday(h.id); setHolidays(await getPPCHolidays(centre.id)); }}
                    className="text-red-600 hover:text-red-800 cursor-pointer">✕</button>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-stone-500">No holidays configured.</p>}
      </div>

      {/* Save Button */}
      {isPPCManager && (
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-2xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Save PPC Configuration</>}
        </button>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 2. PPC SLOTS VIEW
// ══════════════════════════════════════════════════════════════════════════════

interface PPCSlotsViewProps {
  centre: Centre;
  isPPCManager: boolean;
}

export const PPCSlotsView: React.FC<PPCSlotsViewProps> = ({ centre, isPPCManager }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<PPCSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      setSlots(await getSlotsForDate(centre.id, selectedDate));
    } finally { setLoading(false); }
  }, [centre.id, selectedDate]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSlotsForDate(centre.id, selectedDate, true);
      await loadSlots();
    } finally { setGenerating(false); }
  };

  const totalCapacity = slots.reduce((s, sl) => s + sl.capacity_qtl, 0);
  const totalBooked = slots.reduce((s, sl) => s + sl.booked_qtl, 0);
  const totalFarmers = slots.reduce((s, sl) => s + sl.farmer_count, 0);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-100 text-emerald-800';
      case 'LIMITED': return 'bg-amber-100 text-amber-800';
      case 'FULL': return 'bg-red-100 text-red-800';
      case 'BLOCKED': return 'bg-stone-200 text-stone-600';
      case 'BREAK': return 'bg-amber-50 text-amber-700';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">PPC Slot Management</h2>
          <p className="text-xs text-stone-500">{centre.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 text-sm" />
          {isPPCManager && (
            <button onClick={handleGenerate} disabled={generating}
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-60">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Generate Slots
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Slots', value: slots.length, color: 'text-stone-900' },
          { label: 'Total Capacity', value: `${totalCapacity} qtl`, color: 'text-blue-700' },
          { label: 'Booked', value: `${totalBooked} qtl`, color: 'text-amber-700' },
          { label: 'Farmers Booked', value: totalFarmers, color: 'text-emerald-700' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200 text-center">
            <p className="text-[10px] text-stone-500 uppercase font-bold">{c.label}</p>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Slots Table */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
      ) : slots.length > 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
              <tr>
                <th className="p-4">Time</th><th className="p-4">Capacity</th>
                <th className="p-4">Booked</th><th className="p-4">Remaining</th>
                <th className="p-4">Farmers</th><th className="p-4">Status</th>
                <th className="p-4">Utilization</th>
                {isPPCManager && <th className="p-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {slots.map(s => {
                const remaining = s.capacity_qtl - s.booked_qtl;
                const utilPct = s.capacity_qtl > 0 ? Math.round((s.booked_qtl / s.capacity_qtl) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-stone-50">
                    <td className="p-4 font-bold">{formatTime24to12(s.start_time)} – {formatTime24to12(s.end_time)}</td>
                    <td className="p-4 font-mono">{s.capacity_qtl} qtl</td>
                    <td className="p-4 font-mono font-bold">{s.booked_qtl} qtl</td>
                    <td className="p-4 font-mono font-bold">{remaining} qtl</td>
                    <td className="p-4">{s.farmer_count}</td>
                    <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(s.status)}`}>{s.status}</span></td>
                    <td className="p-4">
                      <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${utilPct >= 90 ? 'bg-red-500' : utilPct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(2, utilPct)}%` }} />
                      </div>
                      <span className="text-[10px] text-stone-500">{utilPct}%</span>
                    </td>
                    {isPPCManager && (
                      <td className="p-4">
                        {s.is_blocked ? (
                          <button onClick={async () => { await unblockSlot(s.id); loadSlots(); }}
                            className="text-[10px] text-emerald-700 font-bold underline cursor-pointer">Unblock</button>
                        ) : (
                          <button onClick={async () => { await blockSlot(s.id, 'Blocked by manager'); loadSlots(); }}
                            className="text-[10px] text-red-700 font-bold underline cursor-pointer">Block</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
          <Calendar className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="font-bold text-stone-900">No slots generated for this date</p>
          <p className="text-xs text-stone-500">Configure PPC settings first, then generate slots.</p>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 3. PPC BOOKINGS VIEW (Operator Check-in & Processing)
// ══════════════════════════════════════════════════════════════════════════════

interface PPCBookingsViewProps {
  centre: Centre;
}

export const PPCBookingsView: React.FC<PPCBookingsViewProps> = ({ centre }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState<PPCBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<PPCBooking | null>(null);
  const [actualQty, setActualQty] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await getBookingsForDate(centre.id, selectedDate));
    } finally { setLoading(false); }
  }, [centre.id, selectedDate]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    const b = await getBookingByCode(searchCode.trim().toUpperCase());
    if (b) setSelectedBooking(b);
    else alert('Booking not found');
  };

  const handleStatusUpdate = async (bookingId: string, status: PPCBookingStatus) => {
    setUpdating(true);
    try {
      const extra: { actual_quantity?: number } = {};
      if (status === 'COMPLETED' && actualQty > 0) extra.actual_quantity = actualQty;
      await updateBookingStatus(bookingId, status, extra);
      await loadBookings();
      setSelectedBooking(null);
    } finally { setUpdating(false); }
  };

  const handleCancel = async (bookingId: string) => {
    setUpdating(true);
    try {
      await cancelPPCBooking(bookingId, 'Cancelled by operator');
      await loadBookings();
      setSelectedBooking(null);
    } finally { setUpdating(false); }
  };

  const handleNoShow = async (bookingId: string) => {
    setUpdating(true);
    try {
      await markNoShow(bookingId);
      await loadBookings();
      setSelectedBooking(null);
    } finally { setUpdating(false); }
  };

  // Summary stats
  const total = bookings.length;
  const booked = bookings.filter(b => ['BOOKED', 'CONFIRMED'].includes(b.status)).length;
  const arrived = bookings.filter(b => ['FARMER_ARRIVED', 'LATE'].includes(b.status)).length;
  const processing = bookings.filter(b => ['VERIFICATION', 'WEIGHING', 'PROCESSING'].includes(b.status)).length;
  const completed = bookings.filter(b => b.status === 'COMPLETED').length;
  const cancelled = bookings.filter(b => b.status === 'CANCELLED').length;
  const noShow = bookings.filter(b => b.status === 'NO_SHOW').length;
  const expectedQtl = bookings.filter(b => !['CANCELLED', 'NO_SHOW', 'REJECTED'].includes(b.status))
    .reduce((s, b) => s + b.estimated_quantity, 0);

  const statusColor = (s: PPCBookingStatus) => {
    switch (s) {
      case 'BOOKED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-blue-200 text-blue-900';
      case 'FARMER_ARRIVED': return 'bg-emerald-100 text-emerald-800';
      case 'LATE': return 'bg-orange-100 text-orange-800';
      case 'VERIFICATION': case 'WEIGHING': case 'PROCESSING': return 'bg-amber-100 text-amber-800';
      case 'COMPLETED': return 'bg-emerald-200 text-emerald-900';
      case 'CANCELLED': return 'bg-stone-200 text-stone-600';
      case 'NO_SHOW': return 'bg-red-100 text-red-800';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">PPC Bookings & Check-in</h2>
          <p className="text-xs text-stone-500">{centre.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-stone-300 rounded-xl overflow-hidden">
            <input type="text" value={searchCode} onChange={e => setSearchCode(e.target.value)}
              placeholder="QR / Booking Code" className="px-3 py-2 text-sm w-40 focus:outline-none font-mono" />
            <button onClick={handleSearch} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 cursor-pointer"><Search className="w-4 h-4" /></button>
          </div>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 text-sm" />
          <button onClick={loadBookings} className="p-2 text-stone-500 hover:text-stone-700 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
        {[
          { label: 'Total', value: total, color: 'text-stone-900' },
          { label: 'Booked', value: booked, color: 'text-blue-700' },
          { label: 'Arrived', value: arrived, color: 'text-emerald-700' },
          { label: 'Processing', value: processing, color: 'text-amber-700' },
          { label: 'Completed', value: completed, color: 'text-emerald-800' },
          { label: 'Cancelled', value: cancelled, color: 'text-stone-500' },
          { label: 'No Show', value: noShow, color: 'text-red-700' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-stone-200 text-center">
            <p className="text-[9px] text-stone-500 uppercase font-bold">{c.label}</p>
            <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-3 border border-stone-200 text-xs text-stone-600 text-center">
        Expected Quantity: <strong className="text-stone-900">{expectedQtl} qtl</strong> · Capacity Used: <strong>{total > 0 ? Math.round((completed / total) * 100) : 0}%</strong>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="bg-white rounded-3xl p-6 border-2 border-amber-400 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-stone-900">Booking Details</h3>
            <button onClick={() => setSelectedBooking(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer">✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><span className="text-stone-500">Code</span><p className="font-mono font-bold text-stone-900">{selectedBooking.booking_code}</p></div>
            <div><span className="text-stone-500">Farmer</span><p className="font-bold text-stone-900">{selectedBooking.farmer_name}</p></div>
            <div><span className="text-stone-500">Phone</span><p className="font-mono text-stone-700">{selectedBooking.phone}</p></div>
            <div><span className="text-stone-500">Est. Qty</span><p className="font-bold text-stone-900">{selectedBooking.estimated_quantity} qtl</p></div>
            <div><span className="text-stone-500">Slot</span><p className="font-bold">{formatTime24to12(selectedBooking.slot_start_time)} – {formatTime24to12(selectedBooking.slot_end_time)}</p></div>
            <div><span className="text-stone-500">Crop</span><p className="font-bold">{selectedBooking.crop}</p></div>
            <div><span className="text-stone-500">Status</span><p><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(selectedBooking.status)}`}>{selectedBooking.status}</span></p></div>
            {selectedBooking.actual_quantity && <div><span className="text-stone-500">Actual Qty</span><p className="font-bold text-emerald-800">{selectedBooking.actual_quantity} qtl</p></div>}
          </div>
          {/* QR Code */}
          <div className="flex justify-center p-4 bg-stone-50 rounded-xl">
            <QRCodeSVG value={selectedBooking.booking_code} size={120} level="M" />
          </div>
          {/* Actions based on status */}
          <div className="flex flex-wrap gap-2">
            {selectedBooking.status === 'BOOKED' && (
              <>
                <button onClick={() => handleStatusUpdate(selectedBooking.id, 'CONFIRMED')} disabled={updating}
                  className="px-4 py-2 bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirm</button>
                <button onClick={() => handleCancel(selectedBooking.id)} disabled={updating}
                  className="px-4 py-2 bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancel</button>
              </>
            )}
            {['BOOKED', 'CONFIRMED'].includes(selectedBooking.status) && (
              <>
                <button onClick={() => handleStatusUpdate(selectedBooking.id, 'FARMER_ARRIVED')} disabled={updating}
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Check In</button>
                <button onClick={() => handleStatusUpdate(selectedBooking.id, 'LATE')} disabled={updating}
                  className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Mark Late</button>
                <button onClick={() => handleNoShow(selectedBooking.id)} disabled={updating}
                  className="px-4 py-2 bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> No Show</button>
              </>
            )}
            {['FARMER_ARRIVED', 'LATE'].includes(selectedBooking.status) && (
              <button onClick={() => handleStatusUpdate(selectedBooking.id, 'VERIFICATION')} disabled={updating}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><ChevronRight className="w-3.5 h-3.5" /> Start Verification</button>
            )}
            {selectedBooking.status === 'VERIFICATION' && (
              <button onClick={() => handleStatusUpdate(selectedBooking.id, 'WEIGHING')} disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> Start Weighing</button>
            )}
            {selectedBooking.status === 'WEIGHING' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div>
                  <label className="text-[10px] font-bold text-stone-500">Actual Qty (qtl)</label>
                  <input type="number" value={actualQty} onChange={e => setActualQty(Number(e.target.value))}
                    className="w-32 px-2 py-1.5 rounded-lg border border-stone-300 text-sm font-mono" />
                </div>
                <button onClick={() => handleStatusUpdate(selectedBooking.id, 'PROCESSING')} disabled={updating}
                  className="px-4 py-2 bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 mt-4"><Truck className="w-3.5 h-3.5" /> Processing</button>
              </div>
            )}
            {selectedBooking.status === 'PROCESSING' && (
              <div className="flex items-center gap-2 flex-wrap">
                {actualQty <= 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-stone-500">Actual Qty (qtl)</label>
                    <input type="number" value={actualQty} onChange={e => setActualQty(Number(e.target.value))}
                      className="w-32 px-2 py-1.5 rounded-lg border border-stone-300 text-sm font-mono" />
                  </div>
                )}
                <button onClick={() => handleStatusUpdate(selectedBooking.id, 'COMPLETED')} disabled={updating}
                  className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1 mt-4"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bookings Table */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
      ) : bookings.length > 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-auto shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase border-b border-stone-200">
              <tr>
                <th className="p-3">Code</th><th className="p-3">Farmer</th><th className="p-3">Slot</th>
                <th className="p-3">Est. Qty</th><th className="p-3">Actual</th><th className="p-3">Crop</th>
                <th className="p-3">Status</th><th className="p-3">Arrived</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-stone-50">
                  <td className="p-3 font-mono font-bold text-stone-900">{b.booking_code}</td>
                  <td className="p-3"><p className="font-bold">{b.farmer_name}</p><p className="text-stone-400 font-mono">{b.phone}</p></td>
                  <td className="p-3 font-semibold">{formatTime24to12(b.slot_start_time)}</td>
                  <td className="p-3 font-mono">{b.estimated_quantity} qtl</td>
                  <td className="p-3 font-mono font-bold text-emerald-700">{b.actual_quantity ? `${b.actual_quantity} qtl` : '—'}</td>
                  <td className="p-3">{b.crop}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(b.status)}`}>{b.status.replace(/_/g, ' ')}</span></td>
                  <td className="p-3 text-[10px]">{b.arrival_time ? new Date(b.arrival_time).toLocaleTimeString() : '—'}</td>
                  <td className="p-3">
                    <button onClick={() => { setSelectedBooking(b); setActualQty(b.actual_quantity || b.estimated_quantity); }}
                      className="text-[10px] text-amber-700 font-bold underline cursor-pointer">Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 border border-stone-200 text-center space-y-3">
          <Users className="w-10 h-10 text-stone-400 mx-auto" />
          <p className="font-bold text-stone-900">No bookings for this date</p>
        </div>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// 4. PPC ANALYTICS VIEW
// ══════════════════════════════════════════════════════════════════════════════

interface PPCAnalyticsViewProps {
  centre: Centre;
}

export const PPCAnalyticsView: React.FC<PPCAnalyticsViewProps> = ({ centre }) => {
  const [analytics, setAnalytics] = useState<PPCAnalytics | null>(null);
  const [recommendation, setRecommendation] = useState<{
    configuredCapacity: number; observedCapacity: number | null;
    suggestedCapacity: number | null; dataPoints: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; })(), end: new Date().toISOString().split('T')[0] });
  const [slots, setSlots] = useState<PPCSlot[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r, s] = await Promise.all([
        getPPCAnalytics(centre.id, dateRange.start, dateRange.end),
        getCapacityRecommendation(centre.id),
        getSlotsForDate(centre.id, new Date().toISOString().split('T')[0]),
      ]);
      setAnalytics(a); setRecommendation(r); setSlots(s);
    } finally { setLoading(false); }
  }, [centre.id, dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900">PPC Analytics & Performance</h2>
          <p className="text-xs text-stone-500">{centre.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-stone-300 text-xs" />
          <span className="text-stone-400">to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-stone-300 text-xs" />
          <button onClick={loadData} className="p-2 text-stone-500 hover:text-stone-700 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {analytics && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Farmers Processed', value: analytics.totalFarmersProcessed, icon: '👨‍🌾' },
              { label: 'Quintals Processed', value: `${analytics.totalQtlProcessed}`, icon: '⚖️' },
              { label: 'Avg Qty/Farmer', value: `${analytics.avgQtyPerFarmer} qtl`, icon: '📊' },
              { label: 'Avg Processing', value: `${analytics.avgProcessingTimeMins} min`, icon: '⏱️' },
              { label: 'Utilization', value: `${analytics.dailyUtilizationPct}%`, icon: '📈' },
              { label: 'Avg Farmers/Hr', value: `${analytics.avgFarmersPerHour}`, icon: '🚜' },
              { label: 'Avg Qtl/Hr', value: `${analytics.avgQtlPerHour}`, icon: '🌾' },
              { label: 'No-Show Rate', value: `${analytics.noShowRate}%`, icon: '❌' },
              { label: 'Cancellation Rate', value: `${analytics.cancellationRate}%`, icon: '🚫' },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-stone-200">
                <p className="text-[10px] text-stone-500 uppercase font-bold">{c.icon} {c.label}</p>
                <p className="text-xl font-black text-stone-900 mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Today's Slot Utilization */}
          {slots.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-600" /> Today's Slot Utilization</h3>
              <div className="space-y-2">
                {slots.map(s => {
                  const pct = s.capacity_qtl > 0 ? Math.round((s.booked_qtl / s.capacity_qtl) * 100) : 0;
                  return (
                    <div key={s.id} className="flex items-center gap-3 text-xs">
                      <span className="w-32 font-semibold text-stone-700 text-right">{formatTime24to12(s.start_time)}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden relative">
                        <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(1, pct)}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-stone-900">
                          {s.booked_qtl}/{s.capacity_qtl} qtl ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Capacity Recommendation */}
      {recommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-3xl p-6 border border-blue-200 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-stone-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-700" /> Capacity Recommendation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-white rounded-xl border border-stone-200 text-center">
              <p className="text-stone-500 uppercase font-bold text-[10px]">Configured</p>
              <p className="text-2xl font-black text-stone-900">{recommendation.configuredCapacity} <span className="text-sm">qtl/hr</span></p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-blue-200 text-center">
              <p className="text-blue-700 uppercase font-bold text-[10px]">Observed (7 days)</p>
              <p className="text-2xl font-black text-blue-800">
                {recommendation.observedCapacity !== null ? `${recommendation.observedCapacity}` : '—'} <span className="text-sm">qtl/hr</span>
              </p>
              <p className="text-[10px] text-stone-500">{recommendation.dataPoints} data points</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-emerald-200 text-center">
              <p className="text-emerald-700 uppercase font-bold text-[10px]">Suggested</p>
              <p className="text-2xl font-black text-emerald-800">
                {recommendation.suggestedCapacity !== null ? `${recommendation.suggestedCapacity}` : '—'} <span className="text-sm">qtl/hr</span>
              </p>
            </div>
          </div>
          {recommendation.dataPoints < 5 && (
            <p className="text-xs text-amber-700 flex items-center gap-1"><Zap className="w-3 h-3" /> Need at least 5 completed bookings for accurate recommendations.</p>
          )}
        </div>
      )}
    </div>
  );
};
