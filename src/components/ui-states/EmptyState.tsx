// Empty state UI component
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import React from 'react';
import { FileX, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ 
  title = 'No data found',
  message = 'There are no items to display at the moment.',
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  const defaultIcon = (
    <div className="rounded-full bg-gray-100 p-3">
      <FileX className="h-8 w-8 text-gray-400" />
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      {icon || defaultIcon}
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600 max-w-md">{message}</p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
