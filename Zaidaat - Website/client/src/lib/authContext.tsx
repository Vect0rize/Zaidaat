import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import type { AuthProvidersInfo, AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  providers: AuthProvidersInfo;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [providers, setProviders] = useState<AuthProvidersInfo>({
    googleConfigured: false,
    smsConfigured: false,
    devOtpEnabled: false,
  });
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: AuthUser | null; providers: AuthProvidersInfo }>('/api/auth/me');
      setUser(data.user);
      if (data.providers) setProviders(data.providers);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, providers, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
