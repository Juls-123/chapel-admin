// Route factory for standardized API endpoints with comprehensive error handling
// PHASE 2: Centralized route handling with Supabase integration

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Standardized error response format
export interface ApiError {
  error: true;
  message: string;
  code: string;
  details?: string;
}

// Success response format
export interface ApiSuccess<T = any> {
  error: false;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// Error codes for consistent handling
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

// Route handler options
interface RouteOptions {
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'superadmin';
  validateBody?: ZodSchema;
  validateQuery?: ZodSchema;
  timeout?: number; // milliseconds
}

// Auth context for route handlers
export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'superadmin';
  } | null;
  isAuthenticated: boolean;
}

// Route handler function type - allows returning raw data or ApiResponse
type RouteHandler<T = any> = (
  request: NextRequest,
  context: { params?: any; auth: AuthContext; supabase: any }
) => Promise<any>;

/**
 * Creates a standardized API route with error handling, validation, and auth
 */
export function createRoute<T = any>(
  handler: RouteHandler<T>,
  options: RouteOptions = {}
) {
  return async (request: NextRequest, context?: { params?: any }) => {
    const startTime = Date.now();
    
    try {
      // Initialize Supabase client
      const cookieStore = cookies();
      const supabase = createClient(cookieStore);

      // Handle authentication (stubbed for Phase 2)
      const authContext = await getAuthContext(supabase, options, request);
      
      if (options.requireAuth && !authContext.isAuthenticated) {
        return createErrorResponse(
          'Authentication required',
          ERROR_CODES.UNAUTHORIZED,
          401
        );
      }

      if (options.requiredRole && authContext.user?.role !== options.requiredRole) {
        // Check role hierarchy: superadmin can access admin endpoints
        const hasPermission = authContext.user?.role === 'superadmin' || 
                             authContext.user?.role === options.requiredRole;
        
        if (!hasPermission) {
          return createErrorResponse(
            `Access denied: ${options.requiredRole} role required, but user has ${authContext.user?.role || 'no'} role`,
            ERROR_CODES.FORBIDDEN,
            403
          );
        }
      }

      // Validate request body
      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          const validation = options.validateBody.safeParse(body);
          
          if (!validation.success) {
            return createErrorResponse(
              'Invalid request data',
              ERROR_CODES.VALIDATION_ERROR,
              400,
              formatZodErrors(validation.error)
            );
          }
        } catch (error) {
          return createErrorResponse(
            'Invalid JSON in request body',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
      }

      // Validate query parameters
      if (options.validateQuery) {
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validation = options.validateQuery.safeParse(queryParams);
        
        if (!validation.success) {
          return createErrorResponse(
            'Invalid query parameters',
            ERROR_CODES.VALIDATION_ERROR,
            400,
            formatZodErrors(validation.error)
          );
        }
      }

      // Set up timeout if specified
      if (options.timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timeout after ${options.timeout}ms`));
          }, options.timeout);
        });

        const result = await Promise.race([
          handler(request, { params: context?.params, auth: authContext, supabase }),
          timeoutPromise
        ]);

        return createSuccessResponse(result);
      }

      // Execute handler
      const result = await handler(request, { 
        params: context?.params, 
        auth: authContext, 
        supabase 
      });

      return createSuccessResponse(result);

    } catch (error) {
      console.error('Route error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return createErrorResponse(
            'Request timeout',
            ERROR_CODES.TIMEOUT_ERROR,
            408
          );
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
          return createErrorResponse(
            'Network error',
            ERROR_CODES.NETWORK_ERROR,
            503
          );
        }

        // Database-specific errors
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          return createErrorResponse(
            'Resource already exists',
            ERROR_CODES.CONFLICT,
            409
          );
        }

        if (error.message.includes('foreign key') || error.message.includes('constraint')) {
          return createErrorResponse(
            'Data integrity violation',
            ERROR_CODES.DATABASE_ERROR,
            400
          );
        }
      }

      return createErrorResponse(
        'Internal server error',
        ERROR_CODES.INTERNAL_ERROR,
        500,
        process.env.NODE_ENV === 'development' ? error?.toString() : undefined
      );
    } finally {
      // Log request duration for monitoring
      const duration = Date.now() - startTime;
      console.log(`${request.method} ${request.url} - ${duration}ms`);
    }
  };
}

/**
 * Get authentication context using real Supabase JWT validation
 */
async function getAuthContext(supabase: any, options: RouteOptions, request: NextRequest): Promise<AuthContext> {
  if (!options.requireAuth) {
    return { user: null, isAuthenticated: false };
  }

  try {
    // Import Supabase client for server-side auth
    const { supabase: supabaseClient } = require('@/lib/auth/supabase');
    
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No JWT token provided in Authorization header');
      return { user: null, isAuthenticated: false };
    }

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      console.log('Invalid JWT token:', error?.message);
      return { user: null, isAuthenticated: false };
    }

    // Get user role from admin table
    const { data: adminData } = await supabaseClient
      .from('admins')
      .select('role, first_name, last_name')
      .eq('auth_user_id', user.id)
      .single();

    if (!adminData) {
      console.log('User not found in admins table:', user.email);
      return { user: null, isAuthenticated: false };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: adminData.role
      },
      isAuthenticated: true
    };
  } catch (error) {
    console.error('Auth context error:', error);
    return { user: null, isAuthenticated: false };
  }
}

/**
 * Create standardized success response
 */
function createSuccessResponse<T>(result: any): NextResponse {
  // If handler already returned an ApiResponse format, use it directly
  if (result && typeof result === 'object' && 'error' in result) {
    const status = result.error ? getStatusFromErrorCode(result.code) : 200;
    return NextResponse.json(result, { status });
  }

  // Handler returned raw data, wrap it in success format
  const successResponse: ApiSuccess<T> = {
    error: false,
    data: result as T
  };

  return NextResponse.json(successResponse, { status: 200 });
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number,
  details?: string
): NextResponse {
  const errorResponse: ApiError = {
    error: true,
    message,
    code,
    ...(details && { details })
  };

  return NextResponse.json(errorResponse, { status });
}

/**
 * Format Zod validation errors for user-friendly display
 */
function formatZodErrors(error: ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
}

/**
 * Get HTTP status code from error code
 */
function getStatusFromErrorCode(code: string): number {
  switch (code) {
    case ERROR_CODES.VALIDATION_ERROR:
      return 400;
    case ERROR_CODES.UNAUTHORIZED:
      return 401;
    case ERROR_CODES.FORBIDDEN:
      return 403;
    case ERROR_CODES.NOT_FOUND:
      return 404;
    case ERROR_CODES.CONFLICT:
      return 409;
    case ERROR_CODES.TIMEOUT_ERROR:
      return 408;
    case ERROR_CODES.NETWORK_ERROR:
      return 503;
    case ERROR_CODES.DATABASE_ERROR:
      return 500;
    default:
      return 500;
  }
}

/**
 * Utility for database operations with error handling
 */
export async function executeQuery<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Database error in ${errorContext}:`, error);
    
    if (error instanceof Error) {
      // Re-throw with context for route handler to catch
      throw new Error(`${errorContext}: ${error.message}`);
    }
    
    throw new Error(`${errorContext}: Unknown database error`);
  }
}
