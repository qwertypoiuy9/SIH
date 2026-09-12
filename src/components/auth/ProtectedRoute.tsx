import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useKisanQ } from '../../context/KisanFlowContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { authSession, authLoading } = useKisanQ();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-emerald-700 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-stone-600">Verifying your session...</p>
        </div>
      </div>
    );
  }

  if (!authSession.isAuthenticated || !authSession.user) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!authSession.role || !allowedRoles.includes(authSession.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-center space-y-3 max-w-sm p-8 bg-white rounded-3xl border border-red-200 shadow-sm">
            <p className="text-2xl">🚫</p>
            <h2 className="text-lg font-black text-stone-900">Access Denied</h2>
            <p className="text-sm text-stone-500">
              You don't have permission to view this page.
              Your role: <strong>{authSession.role || 'unknown'}</strong>
            </p>
            <a href="/login" className="text-emerald-700 text-sm font-bold hover:underline">
              ← Back to Login
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
