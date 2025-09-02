// Auth provider that wraps and exposes auth context using stubbed auth service
// NOTE: This file is swap-ready for production Supabase Auth — replace with Supabase wrapper only. Do not change callsites.
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

'use client';

import React, { ReactNode, useEffect } from 'react';
import { useGlobalContext } from '@/contexts/GlobalContext';
import { getCurrentUser } from '@/services/authService';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setDataLoading } = useGlobalContext();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setDataLoading('students', true); // Using students as general auth loading indicator
        const user = await getCurrentUser();
        setUser(user);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setUser(null);
      } finally {
        setDataLoading('students', false);
      }
    };

    initializeAuth();
  }, [setUser, setDataLoading]);

  return <>{children}</>;
}

// HOC wrapper for convenience
export function withAuthProvider<P extends object>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    return (
      <AuthProvider>
        <Component {...props} />
      </AuthProvider>
    );
  };
}
