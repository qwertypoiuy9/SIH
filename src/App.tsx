import React from 'react';
import { KisanFlowProvider, useKisanFlow } from './context/KisanFlowContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/auth/LoginPage';
import { LandingPage } from './components/LandingPage';
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { GovernmentDashboard } from './components/government/GovernmentDashboard';
import { VoiceAssistantModal } from './components/farmer/VoiceAssistantModal';
import { PhoneSimulatorModal } from './components/phone/PhoneSimulatorModal';

const AppContent: React.FC = () => {
  const { activePortal, authSession } = useKisanFlow();

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col">
      {/* Top Navigation */}
      <Navbar />

      {/* Main View Portals */}
      <main className="flex-1">
        {activePortal === 'landing' && <LandingPage />}
        {activePortal === 'login' && <LoginPage />}
        {activePortal === 'farmer' && <FarmerDashboard />}
        {activePortal === 'operator' && <OperatorDashboard />}
        {activePortal === 'government' && <GovernmentDashboard />}
      </main>

      {/* AI Multilingual Voice Assistant Modal */}
      <VoiceAssistantModal />

      {/* Toll-Free Interactive Phone Call Simulator (1800-425-4747) */}
      <PhoneSimulatorModal />
    </div>
  );
};

export default function App() {
  return (
    <KisanFlowProvider>
      <AppContent />
    </KisanFlowProvider>
  );
}
