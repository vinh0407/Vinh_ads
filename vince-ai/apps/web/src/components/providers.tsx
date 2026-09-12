'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/lib/auth';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
}