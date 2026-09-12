import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { KisanQProvider, useKisanQ } from './context/KisanFlowContext';
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

// ── Wires React Router's navigate into the context so context can redirect ──
const NavigateBridge: React.FC = () => {
  const navigate = useNavigate();
  const { setNavigate } = useKisanQ();
  useEffect(() => { setNavigate(navigate); }, [navigate, setNavigate]);
  return null;
};

// ── After login redirect based on role ──────────────────────────────────────
const PortalRedirect: React.FC = () => {
  const { authSession, authLoading } = useKisanQ();
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!authSession.isAuthenticated) return <Navigate to="/login" replace />;
  const role = authSession.role;
  if (role === 'operator') return <Navigate to="/operator" replace />;
  if (role === 'government') return <Navigate to="/government" replace />;
  if (role === 'support') return <Navigate to="/support" replace />;
  return <Navigate to="/farmer" replace />;
};

const AppContent: React.FC = () => {
  const { authSession, authLoading } = useKisanQ();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-stone-500">Loading KisanQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col">
      <NavigateBridge />
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            authSession.isAuthenticated ? <Navigate to="/portal" replace /> : <LoginPage />
          } />

          {/* Role redirect */}
          <Route path="/portal" element={<PortalRedirect />} />

          {/* Protected dashboards */}
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

      {/* Global modals */}
      <VoiceAssistantModal />
      <PhoneSimulatorModal />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <KisanQProvider>
        <AppContent />
      </KisanQProvider>
    </BrowserRouter>
  );
}
