// Error state UI component with retry functionality
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import React from 'react';
import { AlertCircle, RefreshCw, Mail } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showContactAdmin?: boolean;
}

export function ErrorState({ 
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  showContactAdmin = true
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
      <div className="rounded-full bg-red-100 p-3">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600 max-w-md">{message}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}
        
        {showContactAdmin && (
          <button
            onClick={() => {
              // TODO: Implement contact admin functionality
              window.location.href = 'mailto:admin@chapel.edu?subject=Chapel Admin System Error';
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contact Admin
          </button>
        )}
      </div>
    </div>
  );
}
