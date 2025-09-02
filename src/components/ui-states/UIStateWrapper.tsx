// UI state wrapper component that handles loading, error, empty, and data states
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import React, { ReactNode } from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

interface UIStateWrapperProps {
  isLoading: boolean;
  error?: Error | null;
  data?: any[] | any;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRetry?: () => void;
  loadingMessage?: string;
  children: ReactNode;
}

export function UIStateWrapper({
  isLoading,
  error,
  data,
  emptyMessage = 'No items found',
  emptyTitle = 'No data available',
  emptyActionLabel,
  onEmptyAction,
  onRetry,
  loadingMessage,
  children
}: UIStateWrapperProps) {
  // Show loading state
  if (isLoading) {
    return <LoadingState message={loadingMessage} />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        message={error.message || 'An unexpected error occurred'}
        onRetry={onRetry}
      />
    );
  }

  // Show empty state
  const isEmpty = Array.isArray(data) ? data.length === 0 : !data;
  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  // Show data (children)
  return <>{children}</>;
}
