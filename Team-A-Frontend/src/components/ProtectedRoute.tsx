import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If set, only allow specific roles */
  allowedRoles?: string[];
  /** Redirect path on unauthorized */
  redirectTo?: string;
}

/**
 * Route guard — redirects to login if unauthenticated.
 * For admin pages, checks both legacy session and JWT auth.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/admin-login',
}) => {
  const { isAuthenticated, isLoading, admin } = useAuth();

  // Also check legacy session auth
  const legacyAuth = sessionStorage.getItem('adminAuth') === 'true';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !legacyAuth) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && admin && !allowedRoles.includes(admin.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Route guard for student pages — checks student session.
 */
export const StudentProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const studentAuth =
    sessionStorage.getItem('studentAuth') === 'true' ||
    Boolean(sessionStorage.getItem('studentId'));

  if (!studentAuth) {
    return <Navigate to="/student/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
