// SMSDrawerModal — now shows notifications from context
import React from 'react';
import { useKisanQ } from '../../context/KisanFlowContext';
import { MessageSquare, X, CheckCheck, ShieldCheck } from 'lucide-react';

export const SMSDrawerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { notifications } = useKisanQ();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
      <div className="bg-stone-950 text-stone-100 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-stone-800">
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">SMS Notifications</h2>
              <p className="text-[11px] text-stone-400">KisanQ official alerts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-stone-950">
          {notifications.length === 0 && (
            <p className="text-xs text-stone-400 text-center py-8">No notifications yet.</p>
          )}
          {notifications.map(msg => (
            <div key={msg.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" /> AX-KSNFLW</span>
                <span className="text-stone-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs font-bold text-stone-100">{msg.title}</p>
              <p className="text-xs text-stone-300 leading-relaxed">{msg.message}</p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400">
                <CheckCheck className="w-3.5 h-3.5" /><span>Delivered</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
