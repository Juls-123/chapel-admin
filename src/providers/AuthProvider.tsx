// Auth provider with real Supabase Auth and development auto-login
// Automatically signs in during development for seamless experience

'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useGlobalContext } from '@/contexts/GlobalContext';
import { getCurrentUser, signOut } from '@/lib/auth';
import { supabase } from '@/lib/auth/supabase';
import { devAutoLogin } from '@/lib/auth/dev-auth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setDataLoading } = useGlobalContext();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setDataLoading('students', true);
        
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User already authenticated
          const user = await getCurrentUser();
          if (mounted) {
            setUser(user);
          }
        } else if (process.env.NODE_ENV === 'development') {
          // Auto-login in development
          console.log('🔧 Development mode: attempting auto-login...');
          const loginResult = await devAutoLogin('admin');
          if (loginResult?.user && mounted) {
            const user = await getCurrentUser();
            setUser(user);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setDataLoading('students', false);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state changed:', event);
        
        if (session?.user) {
          const user = await getCurrentUser();
          setUser(user);
        } else {
          setUser(null);
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 JWT token auto-refreshed');
        }
        
        setDataLoading('students', false);
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
