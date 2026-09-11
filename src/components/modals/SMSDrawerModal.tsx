import React from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import {
  MessageSquare,
  X,
  CheckCheck,
  Clock,
  ShieldCheck,
  Send,
  Smartphone,
} from 'lucide-react';

export const SMSDrawerModal: React.FC = () => {
  const { isSMSDrawerOpen, setIsSMSDrawerOpen, notifications } = useKisanFlow();

  if (!isSMSDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end">
      {/* Slide-in SMS Drawer */}
      <div className="bg-stone-950 text-stone-100 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-stone-800 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">Govt NIC SMS Inbox</h2>
                <span className="bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-800">
                  DLT Header: TS-KSNFLW
                </span>
              </div>
              <p className="text-[11px] text-stone-400">Recipient: Ravi Kumar (+91 98480 12345)</p>
            </div>
          </div>

          <button
            onClick={() => setIsSMSDrawerOpen(false)}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SMS Feed (Section 25) */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-stone-950">
          <div className="text-center my-2">
            <span className="text-[10px] uppercase font-bold text-stone-500 bg-stone-900 px-3 py-1 rounded-full border border-stone-800">
              Today • 14 September 2026
            </span>
          </div>

          {notifications.map((msg) => (
            <div key={msg.id} className="flex flex-col items-start">
              <div className="max-w-[90%] bg-stone-900 border border-stone-800 rounded-2xl rounded-tl-xs p-3.5 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[10px] text-amber-400 font-bold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    AX-KSNFLW
                  </span>
                  <span className="text-stone-400">{msg.timestamp}</span>
                </div>
                <p className="text-xs text-stone-200 leading-relaxed font-sans">
                  {msg.message}
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400">
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Delivered</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer simulation notice */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 text-[11px] text-stone-400 text-center">
          <span>Official Telecom Regulatory Authority (TRAI) DLT Gateway Simulation</span>
        </div>
      </div>
    </div>
  );
};
