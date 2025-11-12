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
    
    try {
      // Safely extract error information
      let errorInfo: Record<string, any> = { message: 'Unknown error occurred' };
      
      if (error instanceof Error) {
        errorInfo = {
          name: error.name || 'Error',
          message: error.message || 'No error message provided',
          stack: error.stack || 'No stack trace available'
        };
      } else if (error) {
        // Handle non-Error objects
        errorInfo = {
          name: 'Non-Error',
          message: String(error),
          originalValue: error
        };
      }

      // Safely prepare metadata
      const safeMeta = meta || {};
      
      // Create a safe log entry
      const logEntry = {
        timestamp,
        error: errorInfo,
        meta: safeMeta,
        category: this.classifyError(error)
      };

      // In development, log to console with error protection
      if (process.env.NODE_ENV === 'development') {
        try {
          console.error('[ErrorHandler]', JSON.stringify(logEntry, (key, value) => 
            typeof value === 'bigint' ? value.toString() : value
          ));
        } catch (jsonError) {
          // Fallback logging if JSON.stringify fails
          console.error('[ErrorHandler] Error details (raw):', {
            timestamp,
            error: errorInfo,
            metaKeys: Object.keys(safeMeta)
          });
        }
      }

      // TODO: In production, send to logging service (e.g., Sentry, LogRocket)
      // Example: sendToLoggingService(logEntry);
    } catch (handlerError) {
      // Last resort error logging if something goes wrong in the error handler
      console.error('[ErrorHandler] Critical error in error handler:', {
        timestamp,
        originalError: String(error),
        handlerError: String(handlerError)
      });
    }
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
