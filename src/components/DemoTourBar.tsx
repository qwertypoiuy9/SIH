import React, { useState } from 'react';
import { useKisanFlow } from '../context/KisanFlowContext';
import { ChevronRight, PlayCircle, Eye, RefreshCw, Smartphone, Building, Headphones, PhoneCall } from 'lucide-react';

export const DemoTourBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    setActivePortal,
    setFarmerSubTab,
    setIsPhoneModalOpen,
    setIsSMSDrawerOpen,
    callNextFarmer,
    updateProcurement,
    advancePaymentState,
    escalateCallToSupport,
    setLanguage,
  } = useKisanFlow();

  const demoSteps = [
    {
      num: '1-3',
      title: 'Farmer Telugu Portal',
      desc: 'Open KisanFlow in Telugu',
      action: () => {
        setLanguage('te');
        setActivePortal('farmer');
        setFarmerSubTab('dashboard');
      },
      icon: <Smartphone className="w-3.5 h-3.5" />,
    },
    {
      num: '4-8',
      title: 'Smart Load Balancing',
      desc: 'Paddy 25 Qtl, recommends Ramapuram',
      action: () => {
        setActivePortal('farmer');
        setFarmerSubTab('book_slot');
      },
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
    {
      num: '9-10',
      title: 'Token #47 & Queue',
      desc: 'See live queue with 4 ahead',
      action: () => {
        setActivePortal('farmer');
        setFarmerSubTab('live_queue');
      },
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    {
      num: '11-13',
      title: 'Operator "Call Next"',
      desc: 'Operator advances queue & notifies',
      action: () => {
        setActivePortal('operator');
        callNextFarmer();
      },
      icon: <Building className="w-3.5 h-3.5" />,
    },
    {
      num: '14-16',
      title: 'Procure & Pay ₹48,750',
      desc: 'Complete weighing & payment credited',
      action: () => {
        setActivePortal('operator');
        updateProcurement({
          quantityAccepted: 25,
          qualityStatus: 'Grade A (Premium)',
          remarks: 'Moisture 13.8% verified FAQ Grade A',
        });
        setTimeout(() => {
          advancePaymentState();
          setActivePortal('farmer');
          setFarmerSubTab('payment');
        }, 500);
      },
      icon: <RefreshCw className="w-3.5 h-3.5" />,
    },
    {
      num: '17-19',
      title: 'Phone IVR Simulator',
      desc: 'Dial 1800-425-4747 & press 3 for queue',
      action: () => {
        setIsPhoneModalOpen(true);
      },
      icon: <PhoneCall className="w-3.5 h-3.5" />,
    },
    {
      num: '20',
      title: 'Support Centre Escalation',
      desc: 'IVR escalates to live operator',
      action: () => {
        escalateCallToSupport('9848012345');
        setActivePortal('support');
      },
      icon: <Headphones className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <aside aria-label="SIH Demonstration Guide" className="bg-stone-900 text-stone-100 border-b border-stone-800 text-xs py-1.5 px-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full md:w-auto justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-stone-950 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
              SIH Evaluator Demo Guide
            </span>
            <span className="text-stone-300 font-medium hidden sm:inline">
              Follow the end-to-end 20-step flow:
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-stone-400 hover:text-stone-200 text-[11px] underline cursor-pointer"
          >
            {isExpanded ? 'Collapse Steps' : 'View All 20 Steps'}
          </button>
        </div>

        {/* Quick Stepper Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          {demoSteps.map((step, idx) => (
            <button
              key={idx}
              onClick={step.action}
              className="flex items-center gap-1 bg-stone-800 hover:bg-emerald-900/80 hover:text-emerald-200 text-stone-300 px-2 py-1 rounded text-[11px] font-medium border border-stone-700 transition-colors whitespace-nowrap cursor-pointer"
              title={step.desc}
            >
              {step.icon}
              <span className="text-emerald-400 font-bold">Step {step.num}:</span>
              <span>{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      {isExpanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-stone-400">
          <div className="bg-stone-800/60 p-2 rounded">
            <p className="font-bold text-stone-200">1. Multilingual Access</p>
            <p>Farmers can use Telugu, Hindi, English, Kannada, Tamil, or Bengali seamlessly.</p>
          </div>
          <div className="bg-stone-800/60 p-2 rounded">
            <p className="font-bold text-stone-200">2. Smart Load Balancing</p>
            <p>Directs farmers from busy centres (Lakshmipur 42m) to low-queue centres (Ramapuram 15m).</p>
          </div>
          <div className="bg-stone-800/60 p-2 rounded">
            <p className="font-bold text-stone-200">3. Real-Time Shared State</p>
            <p>When Mandi Operator calls next token, the farmer UI & SMS alert update instantly!</p>
          </div>
          <div className="bg-stone-800/60 p-2 rounded">
            <p className="font-bold text-stone-200">4. No Smartphone? No Problem</p>
            <p>1800-425-4747 IVR simulator with live keypad, audio synthesizer, and agent handoff.</p>
          </div>
        </div>
      )}
    </aside>
  );
};
