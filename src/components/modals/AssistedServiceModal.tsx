import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import {
  Users2,
  X,
  Printer,
  CheckCircle2,
  FileText,
  Search,
  Mic,
  Smartphone,
  Sparkles,
} from 'lucide-react';

export const AssistedServiceModal: React.FC = () => {
  const {
    isAssistedModalOpen,
    setIsAssistedModalOpen,
    centres,
    crops,
    bookNewSlot,
    dispatchNotification,
  } = useKisanFlow();

  const [farmerAadhaar, setFarmerAadhaar] = useState('XXXX-XXXX-8812');
  const [farmerMobile, setFarmerMobile] = useState('9848012345');
  const [farmerName, setFarmerName] = useState('Ravi Kumar (రవి కుమార్)');
  const [selectedCrop, setSelectedCrop] = useState('Paddy');
  const [qty, setQty] = useState(25);
  const [centreId, setCentreId] = useState('centre_lakshmipur');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isAssistedModalOpen) return null;

  const handleAssistedBook = (e: React.FormEvent) => {
    e.preventDefault();
    bookNewSlot(centreId, 'slot_2', selectedCrop, qty);
    dispatchNotification('SMS', `Assisted Booking Complete at CSC Lakshmipur for ${farmerName}. Token #47.`);
    setIsSuccess(true);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              🤝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">CSC & Gram Panchayat Assisted Desk</h2>
                <span className="bg-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Village Level Operator
                </span>
              </div>
              <p className="text-xs text-teal-200">
                Helping non-digital and feature-phone farmers book slots & get printed slips
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsSuccess(false);
              setIsAssistedModalOpen(false);
            }}
            className="p-1.5 rounded-full hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-700" />
              </div>
              <h3 className="text-xl font-black text-stone-900">
                Slot Successfully Booked on Farmer's Behalf!
              </h3>
              <p className="text-stone-600 max-w-sm mx-auto">
                Token <strong>#47</strong> has been assigned to <strong>{farmerName}</strong>. Confirmation SMS dispatched to {farmerMobile}.
              </p>

              {/* Printable Physical Slip Mockup */}
              <div className="max-w-sm mx-auto p-4 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-300 text-left font-mono space-y-1.5 text-stone-800">
                <p className="text-center font-bold text-sm border-b border-stone-300 pb-1">
                  GOVERNMENT E-PROCUREMENT SLIP
                </p>
                <div className="flex justify-between text-xs">
                  <span>Token:</span>
                  <span className="font-black text-amber-800 text-base">#47</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Farmer:</span>
                  <span>{farmerName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Aadhaar:</span>
                  <span>{farmerAadhaar}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Centre:</span>
                  <span>Lakshmipur Mandi</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Date & Slot:</span>
                  <span>14 Sep 2026 • 10:00 AM</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Produce:</span>
                  <span>{selectedCrop} ({qty} Quintals)</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handlePrintSlip}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt Slip for Farmer</span>
                </button>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold cursor-pointer"
                >
                  Book Another Farmer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAssistedBook} className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-amber-900">
                <span>⚡ Assisted mode eliminates digital friction for illiterate farmers.</span>
                <span className="font-bold">Village CSC #408</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Farmer Aadhaar / Pattadar ID
                  </label>
                  <input
                    type="text"
                    value={farmerAadhaar}
                    onChange={(e) => setFarmerAadhaar(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Farmer Mobile Number
                  </label>
                  <input
                    type="text"
                    value={farmerMobile}
                    onChange={(e) => setFarmerMobile(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Farmer Full Name
                </label>
                <input
                  type="text"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Crop
                  </label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-bold"
                  >
                    {crops.map(c => (
                      <option key={c.id} value={c.name.split(' ')[0]}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Quantity (Quintals)
                  </label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Select Mandi Centre
                </label>
                <select
                  value={centreId}
                  onChange={(e) => setCentreId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-bold"
                >
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.distance_km} km • Queue: {c.current_queue})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white font-black text-sm rounded-2xl shadow-md cursor-pointer transition-transform active:scale-98"
              >
                Register & Issue Mandi Slip
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
