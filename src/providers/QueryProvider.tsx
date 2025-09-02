// React Query provider wrapper with default configuration
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

'use client';

import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client with default configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// HOC wrapper for convenience
export function withQueryProvider<P extends object>(Component: React.ComponentType<P>) {
  return function WrappedComponent(props: P) {
    return (
      <QueryProvider>
        <Component {...props} />
      </QueryProvider>
    );
  };
}
