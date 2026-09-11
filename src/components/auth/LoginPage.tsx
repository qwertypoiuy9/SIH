import React, { useState } from 'react';
import { useKisanFlow } from '../../context/KisanFlowContext';
import { translations, SUPPORTED_LANGUAGES } from '../../translations';
import {
  User,
  Building2,
  Landmark,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UserRole, UserProfile, LanguageCode } from '../../types';

export const LoginPage: React.FC = () => {
  const {
    language,
    setLanguage,
    loginUser,
  } = useKisanFlow();

  const [activeTab, setActiveTab] = useState<UserRole>('farmer');

  // Farmer form
  const [farmerName, setFarmerName] = useState('');
  const [farmerPhone, setFarmerPhone] = useState('');
  const [farmerVillage, setFarmerVillage] = useState('');
  const [farmerDistrict, setFarmerDistrict] = useState('');
  const [farmerAadhaar, setFarmerAadhaar] = useState('');

  // Operator form
  const [operatorName, setOperatorName] = useState('');
  const [operatorEmployeeId, setOperatorEmployeeId] = useState('');
  const [operatorCentre, setOperatorCentre] = useState('centre_lakshmipur');

  // Government Officer form
  const [govtName, setGovtName] = useState('');
  const [govtDept, setGovtDept] = useState('');
  const [govtDistrict, setGovtDistrict] = useState('');

  const t = translations[language];

  const handleFarmerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmerName || !farmerPhone) return;

    const profile: UserProfile = {
      id: `farmer_${farmerPhone}`,
      role: 'farmer',
      name: farmerName,
      phone: farmerPhone,
      village: farmerVillage,
      district: farmerDistrict,
      state: 'Telangana',
      aadhaar_masked: farmerAadhaar,
      preferred_language: language,
    };
    loginUser(profile);
  };

  const handleOperatorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName) return;

    const profile: UserProfile = {
      id: `operator_${operatorEmployeeId || '01'}`,
      role: 'operator',
      name: operatorName,
      phone: '9848099999',
      employee_id: operatorEmployeeId,
      centre_id: operatorCentre,
      designation: 'Mandi Procurement Officer',
    };
    loginUser(profile);
  };

  const handleGovtLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!govtName) return;

    const profile: UserProfile = {
      id: `govt_${Date.now()}`,
      role: 'government',
      name: govtName,
      phone: '9848088888',
      district: govtDistrict,
      designation: govtDept,
    };
    loginUser(profile);
  };


  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center py-10 px-4">
      {/* Official State Emblem / Banner */}
      <div className="max-w-xl w-full text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 rounded-full text-emerald-900 text-xs font-bold mb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>NATIONAL AGRICULTURAL PROCUREMENT PORTAL • MSP 2026-27</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          KisanFlow
        </h1>
        <p className="text-sm font-semibold text-emerald-800 mt-1">
          Smart Mandi Procurement Management System
        </p>
        <p className="text-xs text-stone-500 mt-0.5">
          Dedicated Role-Based Access backed by Supabase
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Role Tabs */}
        <div className="grid grid-cols-3 border-b border-stone-200 bg-stone-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('farmer')}
            className={`py-3.5 px-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'farmer'
                ? 'bg-white text-emerald-800 border-b-2 border-emerald-700 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <User className="w-4 h-4 text-emerald-600" />
            <span>1. Farmer</span>
          </button>

          <button
            onClick={() => setActiveTab('operator')}
            className={`py-3.5 px-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'operator'
                ? 'bg-white text-amber-800 border-b-2 border-amber-600 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>2. Operator</span>
          </button>

          <button
            onClick={() => setActiveTab('government')}
            className={`py-3.5 px-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeTab === 'government'
                ? 'bg-white text-blue-800 border-b-2 border-blue-600 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Landmark className="w-4 h-4 text-blue-600" />
            <span>3. Officer</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="p-6 sm:p-8">
          {/* FARMER LOGIN */}
          {activeTab === 'farmer' && (
            <form onSubmit={handleFarmerLogin} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Farmer Authentication</h2>
                  <p className="text-xs text-stone-500">Access your slot, queue, token & payments</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  Role: Farmer
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Full Name (రైతు పేరు)
                </label>
                <input
                  type="text"
                  required
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  placeholder="e.g. Ravi Kiran"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Mobile Number (ఫోన్ నంబర్)
                  </label>
                  <input
                    type="tel"
                    required
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Aadhaar (Masked)
                  </label>
                  <input
                    type="text"
                    value={farmerAadhaar}
                    onChange={(e) => setFarmerAadhaar(e.target.value)}
                    placeholder="XXXX-XXXX-4819"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Village
                  </label>
                  <input
                    type="text"
                    value={farmerVillage}
                    onChange={(e) => setFarmerVillage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={farmerDistrict}
                    onChange={(e) => setFarmerDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Language Preference */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Preferred Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code as LanguageCode)}
                      className={`py-2 px-2 text-xs rounded-xl border transition-all cursor-pointer ${
                        language === l.code
                          ? 'bg-emerald-800 text-white font-bold border-emerald-900 shadow-2xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {l.nativeName}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>Login as Farmer (రైతు లాగిన్)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MANDI OPERATOR LOGIN */}
          {activeTab === 'operator' && (
            <form onSubmit={handleOperatorLogin} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Mandi Operator Portal</h2>
                  <p className="text-xs text-stone-500">Manage queue, weighbridge, quality & J-Forms</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full">
                  Role: Mandi Operator
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Operator Name
                </label>
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={operatorEmployeeId}
                    onChange={(e) => setOperatorEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Procurement Centre (PPC)
                  </label>
                  <select
                    value={operatorCentre}
                    onChange={(e) => setOperatorCentre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="centre_lakshmipur">Lakshmipur Procurement Centre</option>
                    <option value="centre_ramapuram">Ramapuram Procurement Centre</option>
                    <option value="centre_kothuru">Kothuru Procurement Centre</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-bold">Operator Responsibilities:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  <li>Gate entry verification & Token calling</li>
                  <li>Moisture test & FAQ grade determination</li>
                  <li>Digital weighbridge gross & tare weights</li>
                  <li>J-Form generation & DBT trigger</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>Login as Mandi Operator</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* GOVERNMENT OFFICER LOGIN */}
          {activeTab === 'government' && (
            <form onSubmit={handleGovtLogin} className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Government Monitoring Portal</h2>
                  <p className="text-xs text-stone-500">District & State Command Centre Access</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-900 font-bold px-2.5 py-1 rounded-full">
                  Role: Officer
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={govtName}
                  onChange={(e) => setGovtName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={govtDistrict}
                    onChange={(e) => setGovtDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={govtDept}
                    onChange={(e) => setGovtDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900">
                <p className="font-bold">Oversight Features:</p>
                <p className="text-[11px] mt-0.5">
                  Full visibility across all procurement centres, real-time bottleneck detection, payment throughput tracking, and operator audit trail logs.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>Login as Government Officer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* SUPABASE CONNECTION SETTINGS — removed per product spec */}
        </div>
      </div>
    </div>
  );
};
