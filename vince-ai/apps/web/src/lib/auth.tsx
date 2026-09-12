'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@vince-ai/shared';
import { api } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: userData } = response.data.data;
    
    document.cookie = `access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
    
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    const { accessToken, refreshToken, user: userData } = response.data.data;
    
    document.cookie = `access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
    
    setUser(userData);
  };

  const logout = async () => {
    try {
      const refreshToken = document.cookie.split('; ').find(row => row.startsWith('refresh_token='))?.split('=')[1];
      await api.post('/auth/logout', { refreshToken });
    } finally {
      document.cookie = 'access_token=; path=/; max-age=0';
      document.cookie = 'refresh_token=; path=/; max-age=0';
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}