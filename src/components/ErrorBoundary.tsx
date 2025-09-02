// React Error Boundary component with ErrorHandler integration
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import React, { Component, ReactNode } from 'react';
import { ErrorHandler } from '@/utils/ErrorHandler';
import { ErrorState } from './ui-states/ErrorState';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error using ErrorHandler
    ErrorHandler.logError(error, {
      component: 'ErrorBoundary',
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorState
          title="Application Error"
          message={this.state.error?.message || 'Something went wrong in the application'}
          onRetry={this.handleRetry}
          showContactAdmin={true}
        />
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for convenience
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
