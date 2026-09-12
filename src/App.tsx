import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { KisanFlowProvider, useKisanFlow } from './context/KisanFlowContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/auth/LoginPage';
import { LandingPage } from './components/LandingPage';
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { GovernmentDashboard } from './components/government/GovernmentDashboard';
import { SupportDashboard } from './components/support/SupportDashboard';
import { VoiceAssistantModal } from './components/farmer/VoiceAssistantModal';
import { PhoneSimulatorModal } from './components/phone/PhoneSimulatorModal';

// ── Portal redirect: reads auth role and sends to the correct dashboard ──
const PortalRedirect: React.FC = () => {
  const { authSession, authLoading } = useKisanFlow();
  if (authLoading) return null;
  if (!authSession.isAuthenticated) return <Navigate to="/login" replace />;
  const role = authSession.role;
  if (role === 'operator') return <Navigate to="/operator" replace />;
  if (role === 'government') return <Navigate to="/government" replace />;
  if (role === 'support') return <Navigate to="/support" replace />;
  return <Navigate to="/farmer" replace />;
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Portal redirect after login */}
          <Route path="/portal" element={<PortalRedirect />} />

          {/* Protected role routes */}
          <Route path="/farmer/*" element={
            <ProtectedRoute allowedRoles={['farmer']}>
              <FarmerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/operator/*" element={
            <ProtectedRoute allowedRoles={['operator']}>
              <OperatorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/government/*" element={
            <ProtectedRoute allowedRoles={['government']}>
              <GovernmentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/support/*" element={
            <ProtectedRoute allowedRoles={['support']}>
              <SupportDashboard />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global modals — available on all authenticated pages */}
      <VoiceAssistantModal />
      <PhoneSimulatorModal />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <KisanFlowProvider>
        <AppContent />
      </KisanFlowProvider>
    </BrowserRouter>
  );
}
