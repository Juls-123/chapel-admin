// Singleton error handler for classification and logging
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

type ErrorCategory = 'network' | 'validation' | 'scan' | 'auth' | 'unknown';

interface ErrorMeta {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  [key: string]: any;
}

class ErrorHandlerClass {
  private static instance: ErrorHandlerClass;

  private constructor() {}

  static getInstance(): ErrorHandlerClass {
    if (!ErrorHandlerClass.instance) {
      ErrorHandlerClass.instance = new ErrorHandlerClass();
    }
    return ErrorHandlerClass.instance;
  }

  /**
   * Classify error into categories for better handling
   */
  classifyError(error: Error | unknown): ErrorCategory {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
        return 'network';
      }
      
      if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
        return 'validation';
      }
      
      if (message.includes('scan') || message.includes('attendance') || message.includes('unmatched')) {
        return 'scan';
      }
      
      if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
        return 'auth';
      }
    }
    
    return 'unknown';
  }

  /**
   * Handle error with classification and appropriate response
   */
  handleError(error: Error | unknown, meta?: ErrorMeta): {
    category: ErrorCategory;
    message: string;
    shouldRetry: boolean;
  } {
    const category = this.classifyError(error);
    let message = 'An unexpected error occurred';
    let shouldRetry = false;

    switch (category) {
      case 'network':
        message = 'Network connection failed. Please check your internet connection.';
        shouldRetry = true;
        break;
      case 'validation':
        message = 'Data validation failed. Please check your input.';
        shouldRetry = false;
        break;
      case 'scan':
        message = 'Attendance scanning error. Please contact support.';
        shouldRetry = false;
        break;
      case 'auth':
        message = 'Authentication failed. Please sign in again.';
        shouldRetry = false;
        break;
      case 'unknown':
      default:
        message = error instanceof Error ? error.message : 'An unknown error occurred';
        shouldRetry = false;
        break;
    }

    // Log the error
    this.logError(error, { ...meta, category });

    return { category, message, shouldRetry };
  }

  /**
   * Log error with metadata for debugging
   */
  logError(error: Error | unknown, meta?: ErrorMeta & { category?: ErrorCategory }): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : { message: String(error) },
      meta: meta || {},
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorHandler:', logEntry);
    }

    // TODO: In production, send to logging service (e.g., Sentry, LogRocket)
    // Example: sendToLoggingService(logEntry);
  }

  /**
   * Create a user-friendly error message
   */
  getUserMessage(error: Error | unknown): string {
    const { message } = this.handleError(error);
    return message;
  }
}

// Export singleton instance
export const ErrorHandler = ErrorHandlerClass.getInstance();

// Convenience exports
export const handleError = (error: Error | unknown, meta?: ErrorMeta) => 
  ErrorHandler.handleError(error, meta);

export const logError = (error: Error | unknown, meta?: ErrorMeta) => 
  ErrorHandler.logError(error, meta);

export const getUserMessage = (error: Error | unknown) => 
  ErrorHandler.getUserMessage(error);
