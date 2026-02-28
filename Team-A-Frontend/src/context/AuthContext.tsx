import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getStoredToken, getStoredAdmin, clearStoredToken } from '../api/client';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  admin: AdminUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  /** Call after successful login to update state */
  onLoginSuccess: (token: string, admin: AdminUser) => void;
  /** Logout and clear all auth state */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    admin: null,
    token: null,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = getStoredToken();
    const admin = getStoredAdmin() as AdminUser | null;
    if (token && admin) {
      setState({ isAuthenticated: true, isLoading: false, admin, token });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  // Listen for auth:expired events from the API client
  useEffect(() => {
    const handler = () => {
      setState({ isAuthenticated: false, isLoading: false, admin: null, token: null });
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const onLoginSuccess = useCallback((token: string, admin: AdminUser) => {
    setState({ isAuthenticated: true, isLoading: false, admin, token });
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setState({ isAuthenticated: false, isLoading: false, admin: null, token: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, onLoginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export default AuthContext;
