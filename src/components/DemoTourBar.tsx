// DemoTourBar — legacy demo stepper, preserved but simplified
import React, { useState } from 'react';
import { useKisanQ } from '../context/KisanFlowContext';
import { PlayCircle } from 'lucide-react';

export const DemoTourBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setActivePortal, setLanguage, setIsPhoneModalOpen } = useKisanQ();

  return (
    <aside className="bg-stone-900 text-stone-100 border-b border-stone-800 text-xs py-1.5 px-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500 text-stone-950 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
            Demo Guide
          </span>
          <span className="text-stone-300 font-medium hidden sm:inline">Quick access to all portals</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { label: '👨‍🌾 Farmer', action: () => { setLanguage('te'); setActivePortal('farmer'); } },
            { label: '🏭 Operator', action: () => setActivePortal('operator') },
            { label: '🏛️ Govt', action: () => setActivePortal('government') },
            { label: '🎧 Support', action: () => setActivePortal('support') },
            { label: '📞 IVR', action: () => setIsPhoneModalOpen(true) },
          ].map((step, i) => (
            <button
              key={i}
              onClick={step.action}
              className="flex items-center gap-1 bg-stone-800 hover:bg-emerald-900/80 hover:text-emerald-200 text-stone-300 px-2 py-1 rounded text-[11px] font-medium border border-stone-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <PlayCircle className="w-3 h-3" />
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-stone-400 hover:text-stone-200 text-[11px] underline cursor-pointer"
        >
          {isExpanded ? 'Collapse' : 'Info'}
        </button>
      </div>

      {isExpanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-stone-400">
          <div className="bg-stone-800/60 p-2 rounded"><p className="font-bold text-stone-200">Secure Authentication</p><p>Email/password signup with full address & geocoding.</p></div>
          <div className="bg-stone-800/60 p-2 rounded"><p className="font-bold text-stone-200">Dynamic Centres</p><p>Procurement centres loaded from DB with Leaflet map.</p></div>
          <div className="bg-stone-800/60 p-2 rounded"><p className="font-bold text-stone-200">Weather API</p><p>OpenWeatherMap with farmer advisory in regional language.</p></div>
          <div className="bg-stone-800/60 p-2 rounded"><p className="font-bold text-stone-200">AI Voice Assistant</p><p>Gemini 2.5 Flash with real slot booking via speech.</p></div>
        </div>
      )}
    </aside>
  );
};
