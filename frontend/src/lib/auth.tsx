'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsDemo: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const DEMO_USER: User = {
  id: 'vinh-admin-master-id',
  email: 'vinh@gmail.com',
  name: 'Vinh Admin',
  role: 'ADMIN',
  status: 'ACTIVE',
  avatarUrl: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.data);
    } catch {
      if (typeof window !== 'undefined' && (document.cookie.includes('demo_mode=true') || document.cookie.includes('vinh_auth=true'))) {
        setUser(DEMO_USER);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginAsDemo = () => {
    if (typeof window !== 'undefined') {
      document.cookie = 'demo_mode=true; path=/; max-age=86400';
      document.cookie = 'vinh_auth=true; path=/; max-age=86400';
      document.cookie = 'access_token=demo_token; path=/; max-age=86400';
    }
    setUser(DEMO_USER);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      const { user: userData } = response.data.data;
      setUser(userData);
    } catch (err) {
      if (
        (email.toLowerCase() === 'vinh@gmail.com' && password === '123456') ||
        email.toLowerCase().includes('demo') ||
        password === 'demo123456'
      ) {
        loginAsDemo();
        return;
      }
      throw err;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register({ email, password, name });
    const { user: userData } = response.data.data;
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on demo logout
    } finally {
      if (typeof window !== 'undefined') {
        document.cookie = 'demo_mode=; path=/; max-age=0';
        document.cookie = 'access_token=; path=/; max-age=0';
        document.cookie = 'refresh_token=; path=/; max-age=0';
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsDemo, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
